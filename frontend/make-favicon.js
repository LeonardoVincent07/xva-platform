import sharp from "sharp";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect width="128" height="128" rx="20" fill="rgb(27,33,44)"/>
  <text x="50%" y="56%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Montserrat, Arial, sans-serif"
        font-size="56"
        font-weight="700"
        fill="rgb(130,199,165)">M7</text>
</svg>
`;

sharp(Buffer.from(svg))
  .png()
  .toFile("public/favicon.png")
  .then(() => console.log("favicon generated"))
  .catch(console.error);