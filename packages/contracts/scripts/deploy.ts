import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect('localhost');

  const mailbox = await ethers.deployContract("BlockMail");
  await mailbox.waitForDeployment();

  const keyRegistry = await ethers.deployContract("KeyRegistry");
  await keyRegistry.waitForDeployment();

  const mailboxAddress = await mailbox.getAddress();
  const keyRegistryAddress = await keyRegistry.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  console.log("BlockMail deployed to:", mailboxAddress, "chainId:", chainId.toString());
  console.log("KeyRegistry deployed to:", keyRegistryAddress, "chainId:", chainId.toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
