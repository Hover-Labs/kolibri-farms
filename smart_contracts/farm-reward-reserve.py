import smartpy as sp

################################################################
################################################################
# Contract
################################################################
################################################################

Addresses = sp.import_script_from_url("file:./test-helpers/addresses.py")

# Acts as a reward reserve for the Kolibri contracts.
class FarmRewardReserve(sp.Contract):
  def __init__(
    self,
    farmAddress = Addresses.FARM_ADDRESS,
    governorAddress = Addresses.GOVERNOR_ADDRESS,
    revokeAddress = Addresses.REVOKE_ADDRESS,
    rewardTokenAddress = Addresses.REWARD_TOKEN_ADDRESS,
    initialized = False,
  ):
    self.init(
      farmAddress = farmAddress,
      governorAddress = governorAddress,
      revokeAddress = revokeAddress,
      rewardTokenAddress = rewardTokenAddress,
      initialized = initialized,
    )

  # Initialize. May only be called once.
  @sp.entry_point
  def initialize(self, farmAddress):
    sp.set_type(farmAddress, sp.TAddress)

    # Only callable by the governor
    sp.verify(sp.sender == self.data.governorAddress, "NOT_GOVERNOR")

    # Only allowed to run once.
    sp.verify(self.data.initialized == False)

    # Initialize contract
    self.data.initialized = True
    self.data.farmAddress = farmAddress

  # Revoke the given number of tokens to the revoke address.
  @sp.entry_point
  def revoke(self, amount):
    sp.set_type(amount, sp.TNat)

    # Only callable by the governor
    sp.verify(sp.sender == self.data.governorAddress, "NOT_GOVERNOR")

    handle = sp.contract(
      sp.TRecord(
        from_ = sp.TAddress,
        to_ = sp.TAddress, 
        value = sp.TNat
      ).layout(("from_ as from", ("to_ as to", "value"))),
      self.data.rewardTokenAddress,
      "transfer"
    ).open_some()
    arg = sp.record(from_ = sp.self_address, to_ = self.data.revokeAddress, value = amount)
    sp.transfer(arg, sp.mutez(0), handle)

  # Give the farm an award allowance.
  @sp.entry_point
  def giveRewardAllowance(self, amount):
    sp.set_type(amount, sp.TNat)

    # Only callable by the governor
    sp.verify(sp.sender == self.data.governorAddress, "NOT_GOVERNOR")

    # Reset to zero, then reset to the given amount.
    approvalHandle = sp.contract(
      sp.TRecord(spender = sp.TAddress, value = sp.TNat).layout(("spender", "value")),
      self.data.rewardTokenAddress,
      "approve"
    ).open_some()

    zeroApprovalArg = sp.record(
      spender = self.data.farmAddress,
      value = sp.nat(0)
    )
    sp.transfer(zeroApprovalArg, sp.mutez(0), approvalHandle)

    newAmountApprovalArg = sp.record(
      spender = self.data.farmAddress, 
      value = amount,
    )
    sp.transfer(newAmountApprovalArg, sp.mutez(0), approvalHandle)

  # Set a new governor. May only be called by the governor.
  @sp.entry_point
  def setGovernorContract(self, newGovernorAddress):
    sp.set_type(newGovernorAddress, sp.TAddress)

    sp.verify(sp.sender == self.data.governorAddress, "NOT_GOVERNOR")
    self.data.governorAddress = newGovernorAddress
      

################################################################
################################################################
# Tests
################################################################
################################################################

# Only run tests if this file is main.
if __name__ == "__main__":

  FA12 = sp.import_script_from_url("file:./test-helpers/fa12.py")

  ################################################################
  # initialize
  ################################################################

  @sp.add_test(name="initialize - can initialize")
  def test():
    scenario = sp.test_scenario()

    # GIVEN a reserve contract
    reserve = FarmRewardReserve()
    scenario += reserve

    # WHEN it is initialized
    scenario += reserve.initialize(Addresses.ROTATED_ADDRESS).run(
      sender = Addresses.GOVERNOR_ADDRESS
    )

    # THEN the contract is initialized
    scenario.verify(reserve.data.farmAddress == Addresses.ROTATED_ADDRESS)
    scenario.verify(reserve.data.initialized == True)

  @sp.add_test(name="initialize - fails if not called by governor")
  def test():
    scenario = sp.test_scenario()

    # GIVEN a reserve contract
    reserve = FarmRewardReserve()
    scenario += reserve

    # WHEN initialize is called by someone other than the governor
    # THEN the call fails.
    scenario += reserve.initialize(Addresses.ROTATED_ADDRESS).run(
      sender = Addresses.NULL_ADDRESS,
      valid = False
    )

  @sp.add_test(name="initialize - fails if already initialized")
  def test():
    scenario = sp.test_scenario()

    # GIVEN a reserve contract which is already initialized
    reserve = FarmRewardReserve(
      initialized = True
    )
    scenario += reserve

    # WHEN initialize is called
    # THEN the call fails.
    scenario += reserve.initialize(Addresses.ROTATED_ADDRESS).run(
      sender = Addresses.GOVERNOR_ADDRESS,
      valid = False
    )    

  ################################################################
  # revoke
  ################################################################

  @sp.add_test(name="revoke - can revoke")
  def test():
    scenario = sp.test_scenario()

    # GIVEN a token contract
    token = FA12.FA12(
      admin = Addresses.GOVERNOR_ADDRESS
    )
    scenario += token

    # AND a reserve contract
    reserve = FarmRewardReserve(
      rewardTokenAddress = token.address,
      revokeAddress = Addresses.REVOKE_ADDRESS,
    )
    scenario += reserve

    # AND the reserve contract has some tokens.
    tokenAmount = 123456789
    scenario += token.mint(
      sp.record(
        address = reserve.address,
        value = tokenAmount
      )
    ).run(
      sender = Addresses.GOVERNOR_ADDRESS
    )

    # WHEN revoke is called
    revokeAmount = 500
    scenario += reserve.revoke(revokeAmount).run(
      sender = Addresses.GOVERNOR_ADDRESS
    )

    # THEN tokens are revoked
    scenario.verify(token.data.balances[Addresses.REVOKE_ADDRESS].balance == revokeAmount)
    scenario.verify(token.data.balances[reserve.address].balance == sp.as_nat(tokenAmount - revokeAmount))

  @sp.add_test(name="revoke - fails if not called by governor")
  def test():
    scenario = sp.test_scenario()

    # GIVEN a token contract
    token = FA12.FA12(
      admin = Addresses.GOVERNOR_ADDRESS
    )
    scenario += token

    # AND a reserve contract
    reserve = FarmRewardReserve(
      rewardTokenAddress = token.address,
      revokeAddress = Addresses.REVOKE_ADDRESS,
    )
    scenario += reserve

    # AND the reserve contract has some tokens.
    tokenAmount = 123456789
    scenario += token.mint(
      sp.record(
        address = reserve.address,
        value = tokenAmount
      )
    ).run(
      sender = Addresses.GOVERNOR_ADDRESS
    )

    # WHEN revoke is called by someone other than the governor
    # THEN the call fails
    revokeAmount = 500
    scenario += reserve.revoke(revokeAmount).run(
      sender = Addresses.NULL_ADDRESS,
      valid = False,
    )

  sp.add_compilation_target("farm-reward-reserve", FarmRewardReserve())

