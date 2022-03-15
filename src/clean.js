const _ = require("lodash");
const Lambda = require("./lambda");

let functions = [];

module.exports.handler = async () => {
	await clean();
	console.debug("Completed Cleaning");
};

const clean = async () => {
	if (functions.length === 0) {
		functions = await Lambda.listFunctions();
	}

	// clone the functions that are left to do so that as we iterate with it we
	// can remove cleaned functions from 'functions'
	const toClean = functions.map(x => x);
	console.debug(`${toClean.length} functions to clean...`, { 
		functions: toClean, 
		count: toClean.length 
	});

	for (const func of toClean) {
		await cleanFunc(func);
		functions = functions.filter((item) => item !== func);
	}
};

const cleanFunc = async (funcArn) => {
	console.debug("cleaning function: ", { function: funcArn });

	// Get aliased lambda versions
	const aliasedVersions = await Lambda.listAliasedVersions(funcArn);

	// Get versions by desc order
	let versions = (await Lambda.listVersions(funcArn));
	versions = _.orderBy(versions, v => parseInt(v), "desc");

	const versionsToKeep = parseInt(process.env.VERSIONS_TO_KEEP || "2");

	// Remove the most recent N versions
	// to prevent these from being accidentally purged
	console.debug(`keeping the most recent ${versionsToKeep} versions`);
	versions = _.drop(versions, versionsToKeep);

	for (const version of versions) {
		if (!aliasedVersions.includes(version)) {
			await Lambda.deleteVersion(funcArn, version);
		}
	}
};