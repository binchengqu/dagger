import { ConnectOpts, EngineConn } from '../engineconn.js';
import { GraphQLClient } from 'graphql-request';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execaCommandSync } from 'execa';

class ImageRef {
	private readonly ref: string;

	/**
	 * id is the unique identifier of the image
	 * based on image's digest
	 */
	private readonly id: string;

	/**
	 * trim image digests to 16 characters to make output more readable
	 */
	private readonly DIGEST_LEN = 16;


	constructor(ref: string) {
		// Throw error if ref is not correctly formatted
		ImageRef.validate(ref);

		this.ref = ref;

		const id = ref.split('@sha256:', 2)[1];
		this.id = id.slice(0, this.DIGEST_LEN);
	}

	get Ref(): string {
		return this.ref;
	}

	get ID(): string {
		return this.id;
	}

	/**
	 * validateImage verify that the passed ref
	 * is compliant with DockerImage constructor
	 *
	 * This function does not return anything but
	 * only throw on error.
	 *
	 * @throws no digest found in ref
	 */
	static validate(ref: string): void {
		if (!ref.includes('@sha256')) {
			throw new Error(`no digest found in ref ${ ref }`);
		}
	}
}

export class DockerImage implements EngineConn {
	private imageRef: ImageRef;

	private readonly cacheDir = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'dagger');

	private readonly ENGINE_SESSION_BINARY_PREFIX = 'dagger-engine-session';

	constructor(u: URL) {
		this.imageRef = new ImageRef(u.host + u.pathname);
	}

	Addr(): string {
		return 'http://dagger';
	}

	async Connect(opts: ConnectOpts): Promise<GraphQLClient> {
		this.createCacheDir();

		const engineSessionBinPath = this.buildBinPath();
		if (!fs.existsSync(engineSessionBinPath)) {
			this.pullEngineSessionBin();
		}

		return new GraphQLClient(`http://localhost:${ opts.Port }/query`);
	}

	/**
	 * createCacheDir will create a cache directory on user
	 * host to store dagger binary.
	 *
	 * If set, it will use XDG directory, if not, it will use `$HOME/.cache`
	 * as base path.
	 * Nothing happens if the directory already exists.
	 */
	private createCacheDir(): void {
		fs.mkdirSync(this.cacheDir, { mode: 0o700, recursive: true });
	}

	/**
	 * buildBinPath create a path to output engine session binary.
	 *
	 * It will store it in the cache directory with a name composed
	 * of the base engine session as constant and the engine identifier.
	 */
	private buildBinPath(): string {
		const binPath = `${ this.cacheDir }/${ this.ENGINE_SESSION_BINARY_PREFIX }-${ this.imageRef.ID }`;

		switch (os.platform()) {
			case 'win32':
				return `${ binPath }.exe`;
			default:
				return binPath;
		}
	}


	private pullEngineSessionBin(): string {
		// Create a temporary bin file
		const tmpBinPath = path.join(this.cacheDir, `temp-${ this.ENGINE_SESSION_BINARY_PREFIX }`);

		console.log(`${ this.ENGINE_SESSION_BINARY_PREFIX }-${ os.platform() }-${ os.arch()}`)
		const dockerRunArgs = [
			'docker',
			'run',
			'--rm',
			'--entrypoint',
			'/bin/cat',
			this.imageRef.Ref,
			`/usr/bin/${ this.ENGINE_SESSION_BINARY_PREFIX }-${ os.platform() }-${ os.arch() }`,
		];

		console.log('here');
		try {
			const fd = fs.openSync(tmpBinPath, 'w', 0o700);

			const process = execaCommandSync(dockerRunArgs.join(' '),
				{
					stdout: 'pipe',
					stderr: 'pipe',
					encoding: 'utf-8',
					// Kill the process if parent exit.
					cleanup: true,
					// Throw on error
					reject: false,
					timeout: 10000,
				}
			);

			console.log(process.stdout.length);
			const buff = Buffer.from(process.stdout);
			console.log(buff.length);
			fs.writeFileSync(fd, buff);
			// fs.writeFileSync(fd, process.stdout, { encoding: 'utf-8' });
		} catch (e) {
			console.log(e);
			fs.rmSync(tmpBinPath);
			throw new Error(`failed to copy engine session binary: ${ e }`);
		}
		console.log("end");

		fs.chmodSync(tmpBinPath, 0o700);
		return tmpBinPath;
	}

	async Close(): Promise<void> {
		return Promise.resolve(undefined);
	}
}