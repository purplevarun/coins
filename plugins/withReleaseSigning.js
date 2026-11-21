const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const readKeystoreProperties = (projectRoot) => {
	const propertiesPath = path.join(projectRoot, "keystore.properties");
	const props = {};
	for (const line of fs.readFileSync(propertiesPath, "utf8").split("\n")) {
		const [key, ...rest] = line.split("=");
		if (key && rest.length > 0) props[key.trim()] = rest.join("=").trim();
	}
	return props;
};

// Copies the release keystore into the generated android/app/ directory so
// Gradle can reference it exactly like the default debug.keystore.
const withReleaseKeystore = (config) =>
	withDangerousMod(config, [
		"android",
		(config) => {
			const source = path.join(
				config.modRequest.projectRoot,
				"release.keystore",
			);
			const target = path.join(
				config.modRequest.platformProjectRoot,
				"app",
				"release.keystore",
			);
			fs.copyFileSync(source, target);
			return config;
		},
	]);

// Points the release build type at a real signing config instead of the
// template's debug key, which Play Protect flags on sideloaded installs.
const withReleaseSigningConfig = (config) =>
	withAppBuildGradle(config, (config) => {
		if (config.modResults.language !== "groovy") return config;
		const { storePassword, keyPassword, keyAlias } = readKeystoreProperties(
			config.modRequest.projectRoot,
		);
		let source = config.modResults.contents;
		if (!source.includes("signingConfigs.release")) {
			source = source.replace(
				/signingConfigs\s*\{/,
				`signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword '${storePassword}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
        }`,
			);
			source = source.replace(
				/(buildTypes[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
				"$1signingConfig signingConfigs.release",
			);
		}
		config.modResults.contents = source;
		return config;
	});

module.exports = (config) =>
	withReleaseSigningConfig(withReleaseKeystore(config));
