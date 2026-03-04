import { existsSync, rmSync } from "fs";
import { readdirSync } from "fs";
import Dockerode from 'dockerode'

const docker = new Dockerode();
const DB_TYPE = process.env.DB_TYPE ?? "sqlite";
const DB_CONTAINER = process.env.DB_CONTAINER;  // set for mysql/postgres overlays

async function findContainer(service: string): Promise<Dockerode.Container> {
  const containers = await docker.listContainers({ all: true });
  // console.log(containers);
  const match = containers.find(c =>
    c.Labels["com.docker.compose.service"] === service &&
    c.Labels["com.docker.compose.project"] === "playwright"
  );
  if (!match) throw new Error(`No container found for service '${service}'`);
  return docker.getContainer(match.Id);
}

async function stopService(service: string) {
  const c = await findContainer(service);
  await c.stop();
  // Wait until actually stopped
  await new Promise<void>((resolve, reject) => {
    const poll = setInterval(async () => {
      const info = await c.inspect();
      if (!info.State.Running) { clearInterval(poll); resolve(); }
    }, 300);
    setTimeout(() => { clearInterval(poll); reject(new Error(`Timeout stopping ${service}`)); }, 15_000);
  });
}

async function startService(service: string) {
  const c = await findContainer(service);
  await c.start();
  await new Promise<void>((resolve, reject) => {
    const poll = setInterval(async () => {
      const info = await c.inspect();
      if (info.State.Running) { clearInterval(poll); resolve(); }
    }, 300);
    setTimeout(() => { clearInterval(poll); reject(new Error(`Timeout starting ${service}`)); }, 30_000);
  });
}

function wipeDbData() {
  const dbdata = "/dbdata";
  if (!existsSync(dbdata)) return;
  for (const entry of readdirSync(dbdata)) {
    rmSync(`${dbdata}/${entry}`, { recursive: true, force: true });
  }
}

export async function resetDatabase() {
  console.log('Stopping Vaultwarden!');
  await stopService("vaultwarden");

  if (DB_TYPE === "sqlite") {
    console.log('Wiping SQLite Database!');
    wipeDbData();
  } else {
    const dbService = DB_CONTAINER!;
    await stopService(dbService);
    console.log(`Wiping ${DB_CONTAINER} Database!`);
    wipeDbData();
    await startService(dbService);
    // Give DB a moment to initialise before starting app
    await new Promise(r => setTimeout(r, 2_000));
  }
  console.log('Starting Vaultwarden!');
  await startService("vaultwarden");

}

export const startApp = async () => {
  await startService("vaultwarden");
};

export const stopApp = async () => {
  await stopService("vaultwarden");
};

export const restartApp = async () => {
  await stopService("vaultwarden");
  await startService("vaultwarden");
};
