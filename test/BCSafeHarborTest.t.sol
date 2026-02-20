// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BCSafeHarbor } from "bc-lib/BCSafeHarbor.sol";
import { BCDeploy } from "bc-lib/BCDeploy.sol";
import {
    AgreementDetails,
    Contact,
    BcAccount,
    BountyTerms,
    ChildContractScope,
    IdentityRequirements
} from "bc-lib/types/AgreementTypes.sol";
import {
    MockAgreementFactory,
    MockAgreement,
    MockBCRegistry,
    MockAttackRegistry,
    MockBCDeployer,
    MockToken
} from "test/mocks/MockBCInfra.sol";

contract BCSafeHarborHarness is BCDeploy, BCSafeHarbor {
    function configure(address registry, address factory, address attackRegistry, address deployer) external {
        _setBcAddresses(registry, factory, attackRegistry, deployer);
    }

    function exposedDefaultBountyTerms() external pure returns (BountyTerms memory) {
        return defaultBountyTerms();
    }

    function exposedBuildAccounts(address[] memory addrs) external pure returns (BcAccount[] memory) {
        return buildAccounts(addrs);
    }

    function exposedDefaultAgreementDetails(
        string memory protocolName,
        Contact[] memory contacts,
        address[] memory contracts,
        address recoveryAddr
    )
        external
        view
        returns (AgreementDetails memory)
    {
        return defaultAgreementDetails(protocolName, contacts, contracts, recoveryAddr);
    }

    function exposedCreateAndAdoptAgreement(
        AgreementDetails memory details,
        address owner,
        bytes32 salt
    )
        external
        returns (address)
    {
        return createAndAdoptAgreement(details, owner, salt);
    }

    function exposedRequestAttackMode(address agreement) external {
        requestAttackMode(agreement);
    }

    function exposedSkipToProduction(address agreement) external {
        skipToProduction(agreement);
    }

    function deployToken() external returns (address) {
        return bcDeployCreate(type(MockToken).creationCode);
    }

    function exposedGetDeployedContracts() external view returns (address[] memory) {
        return getDeployedContracts();
    }
}

contract BCSafeHarborTest is Test {
    BCSafeHarborHarness harness;
    MockAgreementFactory factory;
    MockBCRegistry registry;
    MockAttackRegistry attackRegistry;
    MockBCDeployer deployer;

    function setUp() public {
        vm.chainId(627);

        harness = new BCSafeHarborHarness();
        factory = new MockAgreementFactory();
        registry = new MockBCRegistry();
        attackRegistry = new MockAttackRegistry();
        deployer = new MockBCDeployer();

        harness.configure(address(registry), address(factory), address(attackRegistry), address(deployer));
    }

    function test_defaultBountyTerms() public view {
        BountyTerms memory terms = harness.exposedDefaultBountyTerms();
        assertEq(terms.bountyPercentage, 10);
        assertEq(terms.bountyCapUsd, 1_000_000);
        assertTrue(terms.retainable);
        assertEq(uint256(terms.identity), uint256(IdentityRequirements.Anonymous));
        assertEq(bytes(terms.diligenceRequirements).length, 0);
        assertEq(terms.aggregateBountyCapUsd, 0);
    }

    function test_buildAccounts() public view {
        address[] memory addrs = new address[](2);
        addrs[0] = address(0xAAA);
        addrs[1] = address(0xBBB);

        BcAccount[] memory accounts = harness.exposedBuildAccounts(addrs);
        assertEq(accounts.length, 2);
        assertEq(uint256(accounts[0].childContractScope), uint256(ChildContractScope.All));
        assertEq(uint256(accounts[1].childContractScope), uint256(ChildContractScope.All));
    }

    function test_defaultAgreementDetails_structure() public view {
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Test", contact: "test@test.xyz" });

        address[] memory contracts = new address[](1);
        contracts[0] = address(0xCCC);

        AgreementDetails memory details =
            harness.exposedDefaultAgreementDetails("TestProto", contacts, contracts, address(0xDDD));

        assertEq(details.protocolName, "TestProto");
        assertEq(details.contactDetails.length, 1);
        assertEq(details.chains.length, 1);
        assertEq(details.chains[0].caip2ChainId, "eip155:627");
        assertEq(details.chains[0].accounts.length, 1);
        assertEq(details.bountyTerms.bountyPercentage, 10);
    }

    function test_createAndAdoptAgreement() public {
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Test", contact: "test@test.xyz" });

        address[] memory contracts = new address[](1);
        contracts[0] = address(0xCCC);

        AgreementDetails memory details =
            harness.exposedDefaultAgreementDetails("TestProto", contacts, contracts, address(0xDDD));

        address agreement = harness.exposedCreateAndAdoptAgreement(details, address(this), keccak256("v1"));
        assertTrue(agreement != address(0));

        // Verify commitment window was set (14 days from now)
        MockAgreement mockAgreement = MockAgreement(agreement);
        assertEq(mockAgreement.cantChangeUntil(), block.timestamp + 14 days);

        // Verify adoption was recorded
        assertEq(registry.agreements(address(harness)), agreement);
    }

    function test_requestAttackMode() public {
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Test", contact: "test@test.xyz" });

        address[] memory contracts = new address[](1);
        contracts[0] = address(0xCCC);

        AgreementDetails memory details =
            harness.exposedDefaultAgreementDetails("TestProto", contacts, contracts, address(0xDDD));

        address agreement = harness.exposedCreateAndAdoptAgreement(details, address(this), keccak256("v1"));
        harness.exposedRequestAttackMode(agreement);

        assertTrue(attackRegistry.attackRequested(agreement));
    }

    function test_skipToProduction() public {
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Test", contact: "test@test.xyz" });

        address[] memory contracts = new address[](1);
        contracts[0] = address(0xCCC);

        AgreementDetails memory details =
            harness.exposedDefaultAgreementDetails("TestProto", contacts, contracts, address(0xDDD));

        address agreement = harness.exposedCreateAndAdoptAgreement(details, address(this), keccak256("v1"));
        harness.exposedSkipToProduction(agreement);

        assertTrue(attackRegistry.inProduction(agreement));
    }

    function test_endToEnd_deployAndAdopt() public {
        // Deploy a token through the deployer
        address token = harness.deployToken();
        assertTrue(token != address(0));

        // Build agreement for deployed contracts
        Contact[] memory contacts = new Contact[](1);
        contacts[0] = Contact({ name: "Security", contact: "sec@proto.xyz" });

        AgreementDetails memory details = harness.exposedDefaultAgreementDetails(
            "Proto", contacts, harness.exposedGetDeployedContracts(), address(this)
        );

        assertEq(details.chains[0].accounts.length, 1);

        // Create + adopt + attack mode
        address agreement = harness.exposedCreateAndAdoptAgreement(details, address(this), keccak256("v1"));
        harness.exposedRequestAttackMode(agreement);

        assertTrue(attackRegistry.attackRequested(agreement));
    }
}
