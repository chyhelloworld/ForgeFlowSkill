// Exercise real compiled closeFFChange with narrow filesystem fault injection.
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
const [modulePath, root, fault] = process.argv.slice(2);
const originalOpen = fs.open;
if (fault === 'EXDEV' || fault === 'EIO') {
  fs.rename = async () => { throw Object.assign(new Error(`Injected rename ${fault}`), { code: fault }); };
} else if (fault === 'ENOSPC') {
  fs.open = async (...args) => {
    const handle = await originalOpen(...args);
    if (String(args[0]).endsWith('/ff-disposition.json')) {
      handle.writeFile = async () => { throw Object.assign(new Error('Injected receipt ENOSPC'), { code: 'ENOSPC' }); };
    }
    return handle;
  };
}
syncBuiltinESMExports();
const { closeFFChange } = await import(pathToFileURL(modulePath));
try {
  await closeFFChange({projectRoot:root,changeDir:root+'/openspec/changes/check',archiveDir:root+'/openspec/changes/archive',changeName:'check',disposition:'canceled',reason:'Synthetic fault test',decisionRef:'fixture:fault'});
  console.log(JSON.stringify({unexpectedSuccess:true}));
  process.exitCode=1;
} catch(error) {
  console.log(JSON.stringify({expectedFailure:true,message:error.message}));
}
