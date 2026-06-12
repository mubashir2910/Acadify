
const fs = require("fs");
const files = fs.readFileSync("project_files.txt", "utf-8").split("\n").map(l => l.trim()).filter(Boolean);
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
    let out = "";
    keys.forEach((key, index) => {
        let isLast = index === keys.length - 1;
        let isFile = node[key] === null;
        out += prefix + (isLast ? "+-- " : "+-- ") + key + "\n";
        if (!isFile) {
            out += printTree(node[key], prefix + (isLast ? "    " : "¦   "));
        }
    });
    return out;
}
const output = printTree(tree);
fs.writeFileSync("project_structure_clean.txt", output, "utf-8");

