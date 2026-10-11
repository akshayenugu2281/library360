const fs = require('fs');

const replaceMap = {
  'bg-[#0b57d0]': 'bg-[#0b57d0] dark:bg-[#a8c7fa]',
  'text-[#0b57d0]': 'text-[#0b57d0] dark:text-[#a8c7fa]',
  'border-[#0b57d0]': 'border-[#0b57d0] dark:border-[#a8c7fa]',
  'ring-[#0b57d0]': 'ring-[#0b57d0] dark:ring-[#a8c7fa]',

  'bg-[#f8fafd]': 'bg-[#f8fafd] dark:bg-[#111827]',
  'text-[#1f2937]': 'text-[#1f2937] dark:text-[#f9fafb]',
  'border-[#e5e7eb]': 'border-[#e5e7eb] dark:border-[#374151]',
  'divide-[#e5e7eb]': 'divide-[#e5e7eb] dark:divide-[#374151]',

  'bg-[#e8def8]': 'bg-[#e8def8] dark:bg-[#4a4458]',
  'text-[#1d192b]': 'text-[#1d192b] dark:text-[#e8def8]',

  'bg-[#d3e3fd]': 'bg-[#d3e3fd] dark:bg-[#004a77]',
  'text-[#041e49]': 'text-[#041e49] dark:text-[#c2e7ff]',

  'bg-[#c2e7ff]': 'bg-[#c2e7ff] dark:bg-[#004a77]',
  'text-[#001d35]': 'text-[#001d35] dark:text-[#c2e7ff]',

  'text-[#444746]': 'text-[#444746] dark:text-[#cbd5e1]',
  'text-[#74777f]': 'text-[#74777f] dark:text-[#9ca3af]',

  'bg-[#c4eed0]': 'bg-[#c4eed0] dark:bg-[#146c2e]',
  'text-[#072711]': 'text-[#072711] dark:text-[#c4eed0]',
  'bg-[#146c2e]': 'bg-[#146c2e] dark:bg-[#c4eed0]',
  'text-[#146c2e]': 'text-[#146c2e] dark:text-[#c4eed0]',

  'bg-[#fcedea]': 'bg-[#fcedea] dark:bg-[#601410]',
  'text-[#601410]': 'text-[#601410] dark:text-[#fcedea]',
  'bg-[#b3261e]': 'bg-[#b3261e] dark:bg-[#f2b8b5]',
  'text-[#b3261e]': 'text-[#b3261e] dark:text-[#f2b8b5]',
  
  'bg-[#6750a4]': 'bg-[#6750a4] dark:bg-[#d0bcff]',
  'bg-[#f3f4f6]': 'bg-[#f3f4f6] dark:bg-[#374151]',
  'text-[#4b5563]': 'text-[#4b5563] dark:text-[#9ca3af]',
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('c:/Users/srira/Desktop/OpenProjects/Akshay2/library360-ui/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [find, replace] of Object.entries(replaceMap)) {
    // Only replace if it doesn't already have the replacement
    if (content.includes(find) && !content.includes(replace)) {
      content = content.split(find).join(replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
});
