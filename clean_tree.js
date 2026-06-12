
const fs = require("fs");
let content = fs.readFileSync("project_structure.txt", "utf-16le");
if (content.includes("")) {
    content = fs.readFileSync("project_structure.txt", "utf-8");
}
content = content.replace(//g, " ");
content = content.replace(/\+/g, "+");
content = content.replace(/--/g, "--");
fs.writeFileSync("E:\\Projects\\acadify\\project_structure_clean.txt", content, "utf-8");

