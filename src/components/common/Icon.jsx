export default function Icon({ name, size = 20 }) {
  const images = {
    sticker: 'stickers.png',
    camera: 'camera.png',
    settings: 'settings.png',
    shutter: 'shutter-camera.png',
  };
  if (images[name])
    return (
      <img
        className="provided-icon"
        src={import.meta.env.BASE_URL + 'icons/' + images[name]}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
      />
    );
  const paths = {
    text: <path d="M4 6V4h12v2m-6-2v12m-3 0h6" />,
    check: <path d="m4 10 4 4 8-8" />,
    expand: <path d="M3 8V3h5m4 0h5v5m0 4v5h-5m-4 0H3v-5" />,
    effects: (
      <>
        <path d="m5 12 6-6 3 3-6 6M8 15c-1 2-3 2-5 2 1-1 1-2 1-3s1-2 2-2 2 1 2 3Z" />
        <path d="M15 3v4m-2-2h4m-2 7v4m-2-2h4" />
      </>
    ),
    burst: (
      <>
        <rect x="3" y="6" width="12" height="11" rx="2" />
        <path d="M6 3h9a3 3 0 0 1 3 3v8M6 14l2-2 2 2 2-3" />
      </>
    ),
    photo: (
      <>
        <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
        <circle cx="7" cy="8" r="1.25" />
        <path d="m3 14 4-3 3 2 4-4 3.5 4" />
      </>
    ),
    layout: (
      <>
        <rect x="2.5" y="3" width="15" height="14" rx="1.5" />
        <path d="M2.5 11h15M8.5 11v6" />
      </>
    ),
    eye: (
      <>
        <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" />
        <circle cx="10" cy="10" r="2" />
      </>
    ),
    download: (
      <>
        <path d="M10 2v11m-4-4 4 4 4-4M3 13v5h14v-5" />
      </>
    ),
    retake: (
      <>
        <path d="M3 8a7 7 0 1 1 0 5M3 3v5h5" />
      </>
    ),
    shuffle: (
      <path d="M3 5h2c4 0 6 10 10 10h2m-3-3 3 3-3 3M3 15h2c1 0 2-1 3-2m4-6c1-1 2-2 3-2h2m-3-3 3 3-3 3" />
    ),
    mirror: (
      <>
        <path d="M10 2v16M7 5 2 15h5zm6 0 5 10h-5z" />
      </>
    ),
    timer: (
      <>
        <circle cx="10" cy="11" r="7" />
        <path d="M8 1h4m-2 6v4l3 2M15 4l2-2" />
      </>
    ),
    arrow: (
      <>
        <path d="M3 10h14m-5-5 5 5-5 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
