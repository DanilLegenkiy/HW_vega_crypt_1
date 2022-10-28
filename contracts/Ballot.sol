// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.7.0 <0.9.0;
//import "hardhat/console.sol";

contract Ballot {

    struct Voter {
       // uint weight; // weight is accumulated by delegation
        bool voted;  // if true, that person already voted
        address delegate; // person delegated to
        uint vote;   // index of the voted proposal
    }

    struct Proposal {
        string name;   // name
        uint voteCount; // number of accumulated votes
        address adr;
    }

    struct Status{
        //0 - еще не началось
        //1 - голосование идет
        uint8 StageOfVoting;
        uint BalanceOfCurentVoting;
    }


    address payable public immutable owner;

    uint private start = 0;
    uint private end = 0;
    Status private status;

    mapping(address => Voter) public voters;

    Proposal[] public proposals;

    /*modifier validAddress(address _addr) {
        require(_addr != address(0), "Not valid address");
        _;
    } */

    constructor(){
        owner = payable(msg.sender);
        status.StageOfVoting = 0;
        status.BalanceOfCurentVoting = 0;
    }

    modifier onlyOwner(){
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier time{
        require(block.timestamp<=end && block.timestamp>=start,"Time is up");  
        _;
    }

    uint private D;
    uint private F;
    uint private X;
    string[] private Names;


    function createVoting(uint Sec, uint Fee, uint Pay, string[] memory proposalNames, address[] memory _adr)
     public onlyOwner{
        require(status.StageOfVoting == 0, "Voting have already starded" );
        require(Sec>1, "incorrect value of Seconds");
        require(Fee<=10000, "incorrect value of fee" );
       // require(Pay>=0, "incorrect value of Payment");
        D = Sec;
        F = Fee;
        X = Pay;
        start = block.timestamp;
        end = start + D;

        status.StageOfVoting = 1;
        status.BalanceOfCurentVoting = 0;

        for (uint i = 0; i < proposalNames.length; i++) {
            require(_adr[i] != address(0), "Not valid address of proposals");
            proposals.push(Proposal({
                name: proposalNames[i],
                voteCount: 0,
                adr: _adr[i]
            }));
            Names.push(proposalNames[i]);
        }
    }

   function getInfoOfCurentVoting() public view 
    returns(string memory _status, uint winners_reward, string[] memory Proposals,
     uint seconds_left, uint Fee, uint Payment_amount){
        require(start != 0, "Voting hasn't started yet");
        Proposals = Names;
        if(block.timestamp > end){
            _status = "Voting have already end";
            seconds_left = 0;
        }
        else{
            _status = "Voting is going on right now";
            seconds_left = end - block.timestamp;
        }
        winners_reward = (status.BalanceOfCurentVoting*(10000 -F))/10000;
        Fee = F;
        Payment_amount = X;
    }

    function getExtendedInfo() external view onlyOwner
        returns(uint _BalanceOfConract, Proposal[] memory _Proposals ){
            require(start != 0, "Voting hasn't started yet");
            _BalanceOfConract = address(this).balance;
            _Proposals = proposals;
        }
    
    event withdraw(bool succes);

    function withdrawFees() public onlyOwner{
        require(status.StageOfVoting == 0, "Voting is not over yet");
        uint amount = address(this).balance;
        (bool success, ) = owner.call{value: amount}("");
        emit withdraw(success);
    }

    function voteFor(uint proposal) payable public time{

        require(proposal<proposals.length, "there is no proposal with this number");
        require(msg.value == X, "incorrect payment");
        require(msg.sender != proposals[proposal].adr, "You can't vote for yourself");
        status.BalanceOfCurentVoting+=X;
        Voter storage sender = voters[msg.sender];
        //require(sender.weight != 0, "Has no right to vote");
        require(!sender.voted, "Already voted");
        sender.voted = true;
        sender.vote = proposal;
        proposals[proposal].voteCount += 1;
    }

    function getBalance() external view onlyOwner returns(uint){
        return(address(this).balance);
    }

    /*event winners_name_and_reward(
            string names,
            uint reward
        );*/
    event winners_names_and_rewards(
        string[] names,
        uint rewards
    );

    function num_of_winners() internal view returns(uint max, uint num){
        max = proposals[0].voteCount;
        num = 1;
        for(uint p=1; p<proposals.length; p++){
            if (proposals[p].voteCount > max) {
                max = proposals[p].voteCount;
                num = 1;
            }
            else if(proposals[p].voteCount == max){
                num++;
            }
        }
    }


    function endOfVoting() payable public onlyOwner{
        require(block.timestamp > end, "Voting is not over yet");
        require(status.StageOfVoting == 1, "Voting have already ended");

        (uint max, uint num) = num_of_winners();
        address payable winner;
        delete Names;
        for(uint j = 0; j<proposals.length; j++){
            if(proposals[j].voteCount == max){
                winner = payable(proposals[j].adr);
                winner.transfer((status.BalanceOfCurentVoting*(10000-F))/(10000*num));
                Names.push(proposals[j].name);
            }
        }

        emit winners_names_and_rewards(Names, (status.BalanceOfCurentVoting*(10000-F))/(10000*num));

        end = 0;
        start = 0;
        status.BalanceOfCurentVoting = 0;
        status.StageOfVoting = 0;
        delete proposals;
        delete Names;
    }

}