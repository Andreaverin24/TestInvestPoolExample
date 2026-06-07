import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const contractsDir = path.join(root, "contracts");
const outDir = path.join(root, "artifacts");
const abiDir = path.join(root, "src", "abi");

const sources = Object.fromEntries(
  fs
    .readdirSync(contractsDir)
    .filter((file) => file.endsWith(".sol"))
    .map((file) => [
      file,
      { content: fs.readFileSync(path.join(contractsDir, file), "utf8") }
    ])
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]
      }
    }
  }
};

function findImport(importPath) {
  const candidates = [
    path.join(root, "node_modules", importPath),
    path.join(contractsDir, importPath)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }

  return { error: `Import not found: ${importPath}` };
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

if (output.errors?.length) {
  for (const item of output.errors) {
    const stream = item.severity === "error" ? console.error : console.warn;
    stream(item.formattedMessage);
  }

  if (output.errors.some((item) => item.severity === "error")) {
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(abiDir, { recursive: true });

for (const [sourceName, contracts] of Object.entries(output.contracts)) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    if (!artifact.evm.bytecode.object) {
      continue;
    }

    const normalized = {
      contractName,
      sourceName,
      abi: artifact.abi,
      bytecode: `0x${artifact.evm.bytecode.object}`,
      deployedBytecode: `0x${artifact.evm.deployedBytecode.object}`
    };

    fs.writeFileSync(
      path.join(outDir, `${contractName}.json`),
      `${JSON.stringify(normalized, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(abiDir, `${contractName}.json`),
      `${JSON.stringify(artifact.abi, null, 2)}\n`
    );
  }
}

console.log(`Compiled ${Object.keys(output.contracts).length} Solidity source files.`);
