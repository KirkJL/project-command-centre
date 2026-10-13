import { mkdir, copyFile, readdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
await mkdir(new URL("dist/",root),{recursive:true});
for(const file of ["index.html","login.html"])await copyFile(new URL(file,root),new URL("dist/"+file,root));
for(const directory of ["js","css"]) {
  await mkdir(new URL("dist/"+directory+"/",root),{recursive:true});
  for(const file of await readdir(new URL(directory+"/",root))) {
    if(!file.endsWith("."+directory))continue;
    await copyFile(new URL(directory+"/"+file,root),new URL("dist/"+directory+"/"+file,root));
  }
}
console.log("Built public HTML, CSS and JavaScript in dist/.");
