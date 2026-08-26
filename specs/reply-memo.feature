# Scenarios: Reply to a Memo - 1, Reply to a Memo - 2, Reply to a Memo - 3, Reply to a Memo - 4, Reply to a Memo - 5
Feature: Reply to a Memo

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has spendable output to pay the transaction fee
    Given I open the thread for the post with txid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

  Scenario Outline: Reply to a Memo - 1 a valid reply to a post is broadcast and shown in the thread
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the thread shows a new reply from my address with the text "<message>"

    Examples:
      | message |
      | hello memo |
      | a longer reply with several words. |

  Scenario Outline: Reply to a Memo - 2 an empty reply is rejected
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the thread shows a validation error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      |  |

  Scenario Outline: Reply to a Memo - 3 an over-long reply is rejected
    When I type a reply with the text "<message>"
    When I submit the reply
    Then the thread shows a length error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |

  Scenario Outline: Reply to a Memo - 4 the byte counter counts down from the reply limit
    When I type a reply with the text "<message>"
    Then the thread shows a remaining byte count of <count>

    Examples:
      | message | count |
      |         | 184   |
      | hello   | 179   |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa | 0     |

  Scenario Outline: Reply to a Memo - 5 a reply to a nested reply is broadcast
    And the thread shows a nested reply with the txid bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    When I type a reply to the nested reply with the text "<message>"
    When I submit the reply
    Then the wallet broadcasts an OP_RETURN transaction with the Memo reply prefix
    Then the thread shows a new reply from my address with the text "<message>"

    Examples:
      | message |
      | hello nested |
      | a longer nested reply. |
