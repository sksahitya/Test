const solc = require('solc');
const smtchecker = require('solc/smtchecker');
const smtsolver = require('solc/smtsolver');
const input = {
	"language": "Solidity",
	"settings": {
		"viaIR": true,
		"optimizer": {
			"enabled": true,
			"runs": 999999
		},
		"outputSelection": {
			"*": {
			"": ["ast"],
			"*": ["abi", "metadata", "devdoc", "userdoc", "storageLayout", "evm.legacyAssembly", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers", "evm.gasEstimates", "evm.assembly"]
			}
		},
		"evmVersion": "istanbul"
	}
}
var output = JSON.parse(
    solc.compile(
      JSON.stringify(input),
      { smtSolver: smtchecker.smtCallback(smtsolver.smtSolver, smtsolver.availableSolvers[0]) }
    )
  );