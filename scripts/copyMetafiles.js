import path from "path";
import copyFileSync from "fs-copy-file-sync";

const files = ["LICENSE", ".npmrc"];

const directories = [].concat("memo-parser", "utils");

for (const directory of directories) {
  for (const file of files) {
    const destination = path.join(directory, file);
    copyFileSync(file, destination);
    console.log(`${file} -> ${destination}`);
  }
}
