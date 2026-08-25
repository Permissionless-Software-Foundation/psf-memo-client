# Scenarios: Post a Memo - 1, Post a Memo - 2, Post a Memo - 3
Feature: Post a Memo

  Background:
    Given a wallet authenticated for the address bitcoincash:qqlrzp23w08434twmvr4fxw672whkjy0py26r63g3d
    Given the wallet has a spendable output to pay the transaction fee

  Scenario Outline: Post a Memo - 1 a valid memo is broadcast and shown in the feed
    Given I am viewing the recent posts feed
    When I compose a memo with the text "<message>"
    When I submit the memo
    Then the wallet broadcasts an OP_RETURN transaction with the Memo post prefix
    Then the feed shows a new post from my address with the text "<message>"

    Examples:
      | message |
      | hello memo |
      | a longer memo with several words and punctuation. |
      | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa |

  Scenario Outline: Post a Memo - 2 an empty memo is rejected
    When I compose a memo with the text "<message>"
    When I submit the memo
    Then the app shows a validation error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      |  |

  Scenario Outline: Post a Memo - 3 an over-long memo is rejected
    When I compose a memo with the text "<message>"
    When I submit the memo
    Then the app shows a length error
    Then the wallet does not broadcast any transaction

    Examples:
      | message |
      | bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb |
      | cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc |
