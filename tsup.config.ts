import childProcess from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type Options, defineConfig } from "tsup";

const common: Options = {
	entry: ["src/index.ts"],
	treeshake: false,
	sourcemap: "inline",
	minify: true,
	clean: true,
	dts: true,
	splitting: false,
	format: ["cjs", "esm"],
	external: ["react"],
	injectStyle: false,
};

const getPackageName = async () => {
	try {
		const packageJson = JSON.parse(
			await readFile(path.join(__dirname, "package.json"), "utf-8"),
		);
		return packageJson.name;
	} catch (_error) {
		return "package-name";
	}
};

const linkSelf = async () => {
	await new Promise((resolve) => {
		childProcess.exec("pnpm link:self", (error, _stdout, _stderr) => {
			if (error) {
				// biome-ignore lint/suspicious/noConsole: <explanation>
				console.error(`exec error: ${error}`);
				return;
			}

			resolve(undefined);
		});
	});

	// biome-ignore lint/suspicious/noConsoleLog: <explanation>
	// biome-ignore lint/suspicious/noConsole: <explanation>
	console.log(
		`Run 'pnpm link ${await getPackageName()} --global' inside another project to consume this package.`,
	);
};

export default defineConfig({
	async onSuccess() {
		await linkSelf();
	},
	...common,
});
