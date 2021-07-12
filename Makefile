recompile-farm:
	rm -f smart_contracts/farm-contract.json
	cd token-farm && yarn && yarn run fix-ligo-version 0.11.0 && yarn run compile:clean
	jq .michelson ./token-farm/build/contracts/farm.json | sed 's/^.//' | sed 's/.$$//' |  sed 's/\\"/"/g' | sed 's/\\n//g' > smart_contracts/farm-contract.json