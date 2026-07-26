const { Jimp } = require('jimp');

async function cropImage() {
  const inputPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\1b75e44d-6ce9-4ddf-9fdc-9ba4a99e34ec\\media__1784961276495.jpg';
  const outputPath = 'C:\\Users\\aleem\\.gemini\\antigravity-ide\\brain\\1b75e44d-6ce9-4ddf-9fdc-9ba4a99e34ec\\media_cropped.jpg';
  
  try {
    const image = await Jimp.read(inputPath);
    // Use autocrop to remove any uniform borders (like black bars)
    image.autocrop();
    await image.write(outputPath);
    console.log('Image cropped successfully and saved to ' + outputPath);
  } catch (err) {
    console.error('Error cropping image:', err);
  }
}

cropImage();
