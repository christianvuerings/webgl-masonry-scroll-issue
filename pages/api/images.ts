import images from './images.json';

export default function handler(req, res) {
  res.status(200).json(images);
}
