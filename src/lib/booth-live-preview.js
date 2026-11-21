const stun = [{ urls: 'stun:stun.l.google.com:19302' }];

function gatherIce(connection) {
  if (connection.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    function finish() {
      clearTimeout(timeout);
      connection.removeEventListener('icegatheringstatechange', check);
      resolve();
    }
    function check() {
      if (connection.iceGatheringState === 'complete') finish();
    }
    const timeout = setTimeout(finish, 2500);
    connection.addEventListener('icegatheringstatechange', check);
  });
}

export function createLivePreview({ role, stream, send, onStream, iceServers = [] }) {
  if (typeof RTCPeerConnection === 'undefined') return null;
  const peers = new Map();
  const cameraTrack = stream?.getVideoTracks()[0];
  let outgoingTrack = cameraTrack;
  let closed = false;

  async function configureSender(sender, track, size) {
    const parameters = sender.getParameters();
    if (!parameters.encodings?.length) return;
    parameters.degradationPreference = 'maintain-framerate';
    parameters.encodings[0].maxBitrate = size > 2 ? 400_000 : 900_000;
    parameters.encodings[0].maxFramerate = Math.min(30, track.getSettings().frameRate || 30);
    parameters.encodings[0].scaleResolutionDownBy = Math.max(1, (track.getSettings().height || 360) / 360);
    await sender.setParameters(parameters);
  }

  function remove(seat) {
    const peer = peers.get(seat);
    if (!peer) return;
    peers.delete(seat);
    peer.connection.close();
    onStream(seat, null);
  }

  function open(seat, toId, id, size) {
    remove(seat);
    const connection = new RTCPeerConnection({ iceServers: [...stun, ...iceServers] });
    const peer = { connection, toId, id, size, started: performance.now(), camera: null };
    peers.set(seat, peer);
    if (outgoingTrack) {
      outgoingTrack.contentHint = 'motion';
      peer.sender = connection.addTrack(outgoingTrack, stream);
      peer.trackChange = configureSender(peer.sender, outgoingTrack, size).catch(() => {});
    }
    function showCamera() {
      if (peers.get(seat) !== peer || closed) return;
      onStream(seat, connection.connectionState === 'connected' ? peer.camera : null);
    }
    connection.ontrack = (event) => {
      peer.camera = event.streams[0] || new MediaStream([event.track]);
      showCamera();
    };
    connection.onconnectionstatechange = showCamera;
    return peer;
  }

  async function transmit(seat, peer) {
    const { connection } = peer;
    await connection.setLocalDescription();
    await gatherIce(connection);
    if (!closed && peers.get(seat) === peer) {
      await send({ to: seat, toId: peer.toId, id: peer.id, description: connection.localDescription });
    }
  }

  function update({ seats, peerIds, signals = [], ready }) {
    if (!peerIds || closed) return;
    for (const [seat, peer] of peers) {
      if (peerIds[seat] !== peer.toId || (!stream && !ready.includes(seat))) remove(seat);
    }
    if (stream && !ready.includes(role)) return;
    const position = seats.indexOf(role);
    for (const [index, seat] of seats.entries()) {
      const toId = peerIds[seat];
      if (index === position || !toId || (!stream && !ready.includes(seat))) continue;
      const outgoing = position < index;
      const signal = signals.find((entry) => entry.from === seat && entry.fromId === toId);
      let peer = peers.get(seat);
      try {
        if (outgoing) {
          if (!peer || (peer.connection.connectionState !== 'connected' && performance.now() - peer.started >= 10_000)) {
            peer = open(seat, toId, crypto.randomUUID(), seats.length);
            if (!stream) peer.connection.addTransceiver('video', { direction: 'recvonly' });
            transmit(seat, peer).catch(() => {});
          }
          if (signal?.id === peer.id && signal.description.type === 'answer' && !peer.answered) {
            peer.answered = true;
            peer.connection.setRemoteDescription(signal.description).catch(() => {});
          }
        } else if (signal?.description.type === 'offer' && signal.id !== peer?.id) {
          const receiver = open(seat, toId, signal.id, seats.length);
          receiver.connection.setRemoteDescription(signal.description)
            .then(() => transmit(seat, receiver)).catch(() => {});
        }
      } catch {
        remove(seat);
      }
    }
  }

  return {
    update,
    setVideoTrack(track) {
      const next = track || cameraTrack;
      if (!next || next === outgoingTrack || closed) return;
      outgoingTrack = next;
      next.contentHint = 'motion';
      for (const peer of peers.values()) {
        if (!peer.sender) continue;
        peer.trackChange = peer.trackChange.then(async () => {
          if (peer.connection.signalingState === 'closed' || outgoingTrack !== next) return;
          await peer.sender.replaceTrack(next);
          await configureSender(peer.sender, next, peer.size);
        }).catch(() => {});
      }
    },
    isConnected(seat) {
      return peers.get(seat)?.connection.connectionState === 'connected';
    },
    async stats() {
      const results = await Promise.allSettled([...peers.entries()].map(async ([seat, { connection }]) => {
        const report = await connection.getStats();
        const entries = [...report.values()];
        const transport = entries.find(({ type }) => type === 'transport');
        const pair = report.get(transport?.selectedCandidatePairId);
        const local = report.get(pair?.localCandidateId);
        const remote = report.get(pair?.remoteCandidateId);
        const video = entries.find((entry) => entry.type === 'inbound-rtp' && entry.kind === 'video');
        const outgoing = entries.find((entry) => entry.type === 'outbound-rtp' && entry.kind === 'video');
        const source = report.get(outgoing?.mediaSourceId);
        return [seat, {
          mode: local?.candidateType === 'relay' || remote?.candidateType === 'relay' ? 'Relay' : pair ? 'Direct' : 'Live',
          fps: video?.framesPerSecond,
          captureFps: source?.framesPerSecond,
          sendFps: outgoing?.framesPerSecond,
          limitedBy: outgoing?.qualityLimitationReason,
          rtt: typeof pair?.currentRoundTripTime === 'number' ? Math.round(pair.currentRoundTripTime * 1000) : undefined,
        }];
      }));
      return Object.fromEntries(results.filter((result) => result.status === 'fulfilled').map((result) => result.value));
    },
    close() {
      closed = true;
      for (const seat of peers.keys()) remove(seat);
    },
  };
}
