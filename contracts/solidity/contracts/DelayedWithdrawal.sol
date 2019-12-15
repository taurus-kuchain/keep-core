pragma solidity ^0.5.14;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title Delayed Withdrawal
 * @dev A base contract to allow delayed funds withdrawal from the contract.
 */
contract DelayedWithdrawal is Ownable {
    using SafeMath for uint256;

    uint256 internal _withdrawalDelay;
    uint256 internal _pendingWithdrawal;

    /**
     * @dev Initiate withdrawal of this contract balance to the owner.
     */
    function initiateWithdrawal() public onlyOwner {
        _pendingWithdrawal = block.timestamp + _withdrawalDelay;
    }

    /**
     * @dev Finish withdrawal of this contract balance to the owner.
     */
    function finishWithdrawal(address payable payee) public onlyOwner {
        require(_pendingWithdrawal > 0, "Pending withdrawal timestamp must be set and be greater than zero.");
        require(block.timestamp >= _pendingWithdrawal, "The current time must pass the pending withdrawal timestamp.");

        // Reset pending withdrawal before sending to prevent re-entrancy attacks
        _pendingWithdrawal = 0;
        payee.transfer(address(this).balance);
    }
}
