const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  //const { time } = require("@nomicfoundation/hardhat-network-helpers");


  describe("Create voting function", function () {

    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

    it("initial data", async function () {
      //console.log(10**9);
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      const [str1, Winners, str2, _ , F, X] = await  ballot.getInfoOfCurentVoting();
      //console.log([str1, Winners.toNumber(), str2, F.toNumber(), X.toNumber()]);
      expect( F.toNumber() ).to.equal(5000);
      expect( X.toNumber() ).to.equal(10000);
      expect( Winners.toNumber() ).to.equal(0);
      expect(str1).to.equal("Voting is going on right now");
      expect(str2[0]).to.equal("candidate1");
      expect(str2[1]).to.equal("candidate2");
      await time.increase(181);
      const [_str1, _Winners, _str2, D , _F, _X] = await  ballot.connect(owner).getInfoOfCurentVoting();
      expect(_str1).to.equal("Voting have already end");
      expect(D.toNumber()).equal(0);
    });

    it("invalid address of proposal", async function () {
      await expect(ballot.connect(owner).createVoting(180, 5000, 10000, ["candidate1", "candidate2"],
      [user1.address, ethers.constants.AddressZero])).to.be.revertedWith("Not valid address of proposals");
    });
  
    it("should reverting launching another vote during the active previous one", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await expect(ballot.connect(owner).createVoting(180, 5000, 10000, ["candidate1", "candidate2"],
      [user1.address, user2.address])).to.be.revertedWith("Voting have already starded");
    });

    it("should set the right owner", async function () {
        await expect(ballot.connect(user1).createVoting(180, 5000, 10000, ["candidate1", "candidate2"],
        [user1.address, user2.address])).to.be.revertedWith("Not owner");
      });

    it("incorrect value of seconds", async function () {
        await expect(ballot.connect(owner).createVoting(0, 5000, 10000, ["candidate1", "candidate2"],
        [user1.address, user2.address])).to.be.revertedWith("incorrect value of Seconds");
      });
    it("incorrect value of Fee", async function () {
        await expect(ballot.connect(owner).createVoting(180, 50000, 10000, ["candidate1", "candidate2"],
        [user1.address, user2.address])).to.be.revertedWith("incorrect value of fee");
      });
  
  
  });
  describe("Vote for function", function () {
    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

     it("the correctness work of the vote for function", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      const tx = await ballot.connect(owner).voteFor(0, {value: 10000});
      await expect(() => tx).to.changeEtherBalance(owner, -10000);
      await tx.wait();
      const [str1, Winners, str2, _ , F, X] = await  ballot.getInfoOfCurentVoting();
      expect( Winners.toNumber() ).to.equal(5000);
      const [balance, proposals] = await ballot.getExtendedInfo();
      expect( proposals[0].voteCount.toNumber() ).to.equal(1);
      expect( proposals[1].voteCount.toNumber() ).to.equal(0);
    });

    it("incorrect payment", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await expect(ballot.connect(owner).voteFor(0, {value: 10001})).to.be.revertedWith("incorrect payment");
    });

    it("incorrect number of proposal", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await expect(ballot.connect(owner).voteFor(2, {value: 10000})).to.be.revertedWith("there is no proposal with this number");
    });

    it("vote for yourself", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await expect(ballot.connect(user1).voteFor(0, {value: 10000})).to.be.revertedWith("You can't vote for yourself");
    });

    it("Already voted", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await ballot.connect(owner).voteFor(0, {value: 10000});
      await expect(ballot.connect(owner).voteFor(0, {value: 10000})).to.be.revertedWith("Already voted");
    });

    it("Time is up", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await time.increase(181);
      await expect(ballot.connect(owner).voteFor(0, {value: 10000})).to.be.revertedWith("Time is up");
    });

  });

  describe("End of voting function", function () {

    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

    it("the correctness work of the End of voting function with 1 winner", async function () {
     await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
     await ballot.connect(owner).voteFor(1, {value: 10000});
     await time.increase(181);
     const tx = await ballot.endOfVoting();
     await expect(tx).to.emit(ballot, "winners_names_and_rewards").withArgs(["candidate2"], 5000);
     await expect(() => tx).to.changeEtherBalance(user2, 5000);
     await tx.wait();
    });
   it("the correctness work of the End of voting function with >1 winner", async function () {
    await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
    await ballot.connect(owner).voteFor(0, {value: 10000});
    await ballot.connect(user1).voteFor(1, {value: 10000});
    await time.increase(181);
    const tx = await ballot.endOfVoting();
    await expect(tx).to.emit(ballot, "winners_names_and_rewards").withArgs(["candidate1", "candidate2"], 5000);
    await expect(() => tx).to.changeEtherBalances([user1, user2], [5000, 5000]);
    await tx.wait();
    });

   it("call end of voting during the voting", async function () {
    await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
    await ballot.connect(owner).voteFor(0, {value: 10000});
    await expect(ballot.endOfVoting()).to.be.revertedWith("Voting is not over yet");
    });

   it("repeat call end of voting", async function () {
    await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
    await ballot.connect(owner).voteFor(0, {value: 10000});
    await time.increase(181);
    await ballot.endOfVoting();
    await expect(ballot.endOfVoting()).to.be.revertedWith("Voting have already ended");
   });

   it("Not owner", async function () {
    await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
    await ballot.connect(owner).voteFor(0, {value: 10000});
    await time.increase(181);
    await expect(ballot.connect(user1).endOfVoting()).to.be.revertedWith("Not owner");
   });
  });

  describe("withdraw Fees function", function () {

    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

    it("the correctness work of the withdraw Fees function", async function () {
     await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
     await ballot.connect(owner).voteFor(0, {value: 10000});
     await time.increase(181);
     await ballot.endOfVoting();
     const balance = await ballot.getBalance();
     const tx = await ballot.withdrawFees();
     await expect(tx).to.emit(ballot, "withdraw").withArgs(true);
     await expect(balance -  await ballot.getBalance()).to.equal(balance);
     await expect(() => tx).to.changeEtherBalance(owner, 5000);
     await tx.wait();
    });

    it("Not owner", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await ballot.connect(owner).voteFor(0, {value: 10000});
      await time.increase(181);
      await ballot.endOfVoting();
      await expect(ballot.connect(user1).withdrawFees()).to.be.revertedWith("Not owner");
     });

     it("it is not allowed to withdraw the fees until the voting is completed", async function () {
      await ballot.createVoting(180, 5000, 10000, ["candidate1", "candidate2"],[user1.address, user2.address]);
      await ballot.connect(owner).voteFor(0, {value: 10000});
      await expect(ballot.withdrawFees()).to.be.revertedWith("Voting is not over yet");
     });
  });
  describe("get info branches", function () {

    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

    it("Voting hasn't started yet", async function () {
      await expect(ballot.getExtendedInfo()).to.be.revertedWith("Voting hasn't started yet");
      await expect(ballot.getInfoOfCurentVoting()).to.be.revertedWith("Voting hasn't started yet");
    });

    it("Not owner (for extended info)", async function () {
      await expect(ballot.connect(user1).getExtendedInfo()).to.be.revertedWith("Not owner");
    });
  });
  describe("get balance of contract", function () {

    let owner;
    let user1;
    let user2;
    let ballot;

    beforeEach(async function(){
      [owner, user1, user2] = await ethers.getSigners();
      const Ballot = await ethers.getContractFactory("Ballot");
      ballot = await Ballot.deploy();
      await ballot.deployed();
    });

    it("start balance = 0", async function () {
      expect(await ballot.connect(owner).getBalance()).to.equal(0);
    });

    it("not owner", async function () {
      await expect(ballot.connect(user1).getBalance()).to.be.revertedWith("Not owner");
    });
  });