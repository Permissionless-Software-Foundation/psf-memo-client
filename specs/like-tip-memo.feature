# Scenarios: Like / Tip a Memo - 1, Like / Tip a Memo - 2, Like / Tip a Memo - 3, Like / Tip a Memo - 4, Like / Tip a Memo - 5, Like / Tip a Memo - 6, Like / Tip a Memo - 7, Like / Tip a Memo - 8, Like / Tip a Memo - 9, Like / Tip a Memo - 10
Feature: Like / Tip a Memo

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has a spendable balance of 100000 sats
    Given a post with the txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa authored by the author address

  Scenario: Like / Tip a Memo - 1 the heart icon opens the like/tip modal
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then a like/tip modal opens for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario Outline: Like / Tip a Memo - 2 a pure like broadcasts the Memo like action
    Given a post with the txid <txid> authored by the author address
    When I click the heart icon on the post with txid <txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>
    Then the wallet sends no tip
    Then the like count on the post increases by one
    Then the heart icon on the post shows as filled

    Examples:
      | txid |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: Like / Tip a Memo - 3 a like with a tip broadcasts and pays the author
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I enter a tip of <tip>
    When I submit the like
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then the wallet sends a tip of <tip> to the author address
    Then the like count on the post increases by one
    Then the heart icon on the post shows as filled

    Examples:
      | tip |
      | 3000 |
      | 25000 |

  Scenario Outline: Like / Tip a Memo - 4 an invalid tip is rejected
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I enter a tip of <tip>
    When I submit the like
    Then the like/tip modal shows an error containing "valid number"
    Then the wallet does not broadcast any transaction

    Examples:
      | tip |
      | 1.5 |
      | abc |

  Scenario Outline: Like / Tip a Memo - 5 a tip below the dust limit is rejected
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I enter a tip of <tip>
    When I submit the like
    Then the like/tip modal shows an error containing "dust limit"
    Then the wallet does not broadcast any transaction

    Examples:
      | tip |
      | 1 |
      | 2999 |

  Scenario: Like / Tip a Memo - 6 a tip above the maximum is rejected
    Given the wallet has a spendable balance of 150000000 sats
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I enter a tip of 100000001
    When I submit the like
    Then the like/tip modal shows an error containing "maximum"
    Then the wallet does not broadcast any transaction

  Scenario Outline: Like / Tip a Memo - 7 a tip above the spendable balance is rejected
    Given the wallet has a spendable balance of <balance> sats
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I enter a tip of <tip>
    When I submit the like
    Then the like/tip modal shows an error containing "spendable"
    Then the wallet does not broadcast any transaction

    Examples:
      | balance | tip |
      | 30000   | 35000 |
      | 500000  | 550000 |

  Scenario Outline: Like / Tip a Memo - 8 a user without spendable balance cannot like
    Given the wallet has a spendable balance of <balance> sats
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    Then the like/tip modal shows an error containing "add BCH"
    Then the wallet does not broadcast any transaction

    Examples:
      | balance |
      | 0 |
      | 2999 |

  Scenario Outline: Like / Tip a Memo - 9 a user can like their own post
    Given a post with the txid <txid> authored by my address
    When I click the heart icon on the post with txid <txid>
    When I submit the like without a tip
    Then the wallet broadcasts an OP_RETURN transaction with the Memo like prefix and the post txid <txid>
    Then the like count on the post increases by one

    Examples:
      | txid |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario: Like / Tip a Memo - 10 the cancel button closes the like/tip modal
    When I click the heart icon on the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    When I click the cancel button
    Then the like/tip modal closes
