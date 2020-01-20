import {initContracts} from './helpers/initContracts';
import {createSnapshot, restoreSnapshot} from "./helpers/snapshot";
import {bls} from './helpers/data';

contract('KeepRandomBeaconService', function(accounts) {
    let serviceContract;
    let operatorContract;

    before(async () => {
        let contracts = await initContracts(
          artifacts.require('./KeepToken.sol'),
          artifacts.require('./TokenStaking.sol'),
          artifacts.require('./KeepRandomBeaconService.sol'),
          artifacts.require('./KeepRandomBeaconServiceImplV1.sol'),
          artifacts.require('./stubs/KeepRandomBeaconOperatorPricingStub.sol')
        );
    
        serviceContract = contracts.serviceContract;
        operatorContract = contracts.operatorContract;

        await operatorContract.registerNewGroup(bls.groupPubKey);
    });

    beforeEach(async () => {
        await createSnapshot()
    });
    
    afterEach(async () => {
      await restoreSnapshot()
    });

    it("should correctly evaluate entry verification fee", async () => {
        await serviceContract.setPriceFeedEstimate(200);
        await operatorContract.setEntryVerificationGasEstimate(12);        

        let fees = await serviceContract.entryFeeBreakdown();
        let entryVerificationFee = fees.entryVerificationFee;

        let expectedEntryVerificationFee = 3600; // 200 * 12 * 150%
        assert.equal(expectedEntryVerificationFee, entryVerificationFee);
    });

    it("should correctly evaluate DKG contribution fee", async () => {
        await serviceContract.setPriceFeedEstimate(1234);
        await operatorContract.setDkgGasEstimate(13);

        let fees = await serviceContract.entryFeeBreakdown();
        let dkgContributionFee = fees.dkgContributionFee;

        let expectedDkgContributionFee = 160; // 1234 * 13 * 1% = 160.42
        assert.equal(expectedDkgContributionFee, dkgContributionFee);
    });

    it("should correctly evaluate callback fee", async function() {
        await serviceContract.setPriceFeedEstimate(160);

        let callbackGas = 1091;

        let callbackFee = await serviceContract.callbackFee(callbackGas);
        
        let expectedCallbackFee = 261840; // 1091 * 160 * 150%
        assert.equal(expectedCallbackFee, callbackFee);
    });

    it("should correctly evaluate entry fee estimate", async () => {
        await serviceContract.setPriceFeedEstimate(200);
        await operatorContract.setEntryVerificationGasEstimate(12); 
        await operatorContract.setDkgGasEstimate(14); 
        await operatorContract.setGroupSize(13);
        await operatorContract.setGroupMemberBaseReward(3);
        await operatorContract.setGroupSelectionStartGasEstimate(2);

        let callbackGas = 7;

        let entryFeeEstimate = await serviceContract.entryFeeEstimate(
            callbackGas
        );

        // entry verification fee = 12 * 200 * 150% = 3600
        // dkg contribution fee = 14 * 200 * 1% = 28
        // group profit fee = 13 * 3 = 39
        // callback fee = 7 * 200 * 150% = 2100
        // group selection start gas estimate = 2 * 200 * 150% = 600
        // entry fee = 3600 + 28 + 39 + 2100 + 600 = 6367
        let expectedEntryFeeEstimate = 6367;
        assert.equal(expectedEntryFeeEstimate, entryFeeEstimate)
    });
});
