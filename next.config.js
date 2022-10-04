module.exports = () => {
  const rewrites = () => {
    return [
      {
        source: '/image/:path*',
        destination: 'https://i.pinimg.com/:path*',
      },
    ];
  };
  return {
    rewrites,
  };
};
