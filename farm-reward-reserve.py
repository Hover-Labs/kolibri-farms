import smartpy as sp

################################################################
################################################################
# Contract
################################################################
################################################################

# Acts as a reward reserve for the Kolibri contracts.
class FarmRewardReserve(sp.Contract):
  def __init__(
    self,
    governorAddress = sp.address("tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf"),
    farmAddress = sp.address("tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf"),
    rewardTokenAddress = sp.address("tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf"),
    revokeAddress = sp.address("tz1abmz7jiCV2GH2u81LRrGgAFFgvQgiDiaf"),
  ):
    self.init(
      governorAddress = governorAddress,
      farmAddress = farmAddress,
      rewardTokenAddress = rewardTokenAddress,
      revokeAddress = revokeAddress,
    )

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

  @sp.add_test(name="test - compiles")
  def test():
    scenario = sp.test_scenario()
    reserve = FarmRewardReserve()
    scenario += reserve


  sp.add_compilation_target("farm-reward-reserve", FarmRewardReserve())

