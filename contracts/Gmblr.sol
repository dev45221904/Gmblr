// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Gmblr is VRFConsumerBaseV2Plus {
    address private constant VRF_COORDINATOR = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 private constant KEY_HASH = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    uint32 private constant CALLBACK_GAS_LIMIT = 300000;
    uint32 public callbackGasLimit = 300000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    

    uint256 private immutable i_subscriptionId;

    constructor(uint256 subid) VRFConsumerBaseV2Plus(VRF_COORDINATOR){
        i_subscriptionId = subid;
    }

    uint256[] public tickets = [11293, 11246, 11563, 11111, 11456];

    uint256 public WinnerTicket;

    event WinnerPicked(uint256 indexed requestId, uint256 WinnerTicket);


    function setCallbackGasLimit(uint32 newLimit) external onlyOwner {
        require(newLimit <= 2_500_000, "Above Chainlink max");
        callbackGasLimit = newLimit;
    }
    

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 ThechosenOne = randomWords[0] % tickets.length;
        WinnerTicket = tickets[ThechosenOne];
        emit WinnerPicked(requestId, WinnerTicket);
    }

    event DrawRequested(uint256 indexed requestId);

    uint256 public ticketsSold;
    bool public draw;

    function drawWinner() external onlyOwner returns (uint256 requestId) {
        require(ticketsSold == tickets.length, "Not all tickets sold");
        require(!draw, "Draw already requested");
        draw = true;
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: KEY_HASH,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        emit DrawRequested(requestId);
    }

    uint256 public constant price = 1e15;

    mapping (uint256 => address) public TickOwner;
    mapping (address => bool) public    HasBought;

    event TicketPurchased(address buyer, uint256 index );

    function purchase(uint256 index) public payable{

        require(!HasBought[msg.sender], "Already Bought 1, Cannot buy more");
        require(msg.value == price, "please enter the valid amount");
        require(index < tickets.length, "mention valid ticket Sequence");

        uint256 SelectedOne = tickets[index];
        require(TickOwner[SelectedOne] == address(0), "Ticket already sold"); // An unsold ticket maps to address(0), the “empty” address

        TickOwner[SelectedOne] = msg.sender;
        HasBought[msg.sender] = true;
        ticketsSold++;
        emit TicketPurchased(msg.sender, SelectedOne);
    }

    bool public claimed;

    event PrizeClaimed(address indexed winner, uint256 amount);

    function isWinner(address user) public view returns (bool) {
        return WinnerTicket != 0 && TickOwner[WinnerTicket] == user;
    }

    function claimPrize() external {
        require(!claimed, "Prize already claimed");
        require(isWinner(msg.sender), "Not the winner");

        claimed = true;
        uint256 amount = address(this).balance;
        emit PrizeClaimed(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }
}