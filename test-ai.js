const fs = require('fs');
console.log("Checking upload-ocr AI prompt...");
const content = fs.readFileSync('src/app/api/menu/upload-ocr/route.ts', 'utf8');
console.log(content.includes("130/210") ? "Prompt is updated" : "Prompt is NOT updated");
