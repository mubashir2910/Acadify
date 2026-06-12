
const fs = require("fs");
const files = fs.readFileSync("project_files.txt", "utf-16le").replace(/\0/g, "").split("\n").map(l => l.trim()).filter(Boolean);

let out = "# Project Statistics\n\n";
out += "- **Total Code Files**: 381\n";
out += "- **Total Lines of Code**: 58,481\n\n";
out += "## Folder Structure & Files\n\n```text\n";

const root = "E:\\Projects\\acadify\\";
const tree = {};
files.forEach(file => {
    let relPath = file.replace(root, "");
    let parts = relPath.split("\\");
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (!current[part]) {
            current[part] = i === parts.length - 1 ? null : {};
        }
        current = current[part];
    }
});

function printTree(node, prefix = "") {
    let keys = Object.keys(node);
    let str = "";
    keys.forEach((key, index) => {
        let isLast = index === keys.length - 1;
        let isFile = node[key] === null;
        str += prefix + (isLast ? "+-- " : "+-- ") + key + "\n";
        if (!isFile) {
            str += printTree(node[key], prefix + (isLast ? "    " : "¦   "));
        }
    });
    return str;
}

out += "acadify\n";
out += printTree(tree);
out += "```\n";

fs.writeFileSync("C:\\Users\\MUBASHIR IQBAL\\.gemini\\antigravity\\brain\\0b2dcdd4-b605-4484-9728-279ec0ebf67c\\project_statistics.md", out, "utf-8");

