"""Regression tests for batch retry classification."""

from __future__ import annotations

import json
import unittest

from .run_with_progress import is_transient_network_error


class RetryClassificationTests(unittest.TestCase):
    def test_empty_storage_response_json_error_is_transient(self) -> None:
        with self.assertRaises(json.JSONDecodeError) as caught:
            json.loads("")
        self.assertTrue(is_transient_network_error(caught.exception))

    def test_model_json_delimiter_error_is_not_network(self) -> None:
        with self.assertRaises(json.JSONDecodeError) as caught:
            json.loads('{"a": 1 "b": 2}')
        self.assertFalse(is_transient_network_error(caught.exception))

    def test_regular_validation_error_is_not_transient(self) -> None:
        self.assertFalse(is_transient_network_error(ValueError("invalid bbox")))


if __name__ == "__main__":
    unittest.main()
