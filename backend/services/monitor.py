"""
Regulation change monitoring service.

TODO: Build this feature after launch.
When implemented, this service will:
1. Periodically fetch the current version of each regulation from CanLII
2. Diff against stored chunks to detect new/modified/removed sections
3. Send email + dashboard alert to admin with a summary of changes
4. Admin reviews and clicks "Approve Update" in the admin panel
5. System re-ingests the updated sections, replacing old chunks
"""
import logging

logger = logging.getLogger(__name__)


async def check_for_updates(document_id: str) -> dict:
    """
    TODO: Fetch the current regulation text from CanLII for the given document,
    compare against stored chunks, and return a diff summary.
    """
    raise NotImplementedError("Regulation monitoring not yet implemented")


async def diff_chunks(document_id: str, new_text: str) -> list[dict]:
    """
    TODO: Compare new_text against existing chunks for document_id.
    Return list of {type: 'added'|'modified'|'removed', section_number, old_text, new_text}.
    """
    raise NotImplementedError("Regulation monitoring not yet implemented")


async def notify_admin(document_id: str, diff: list[dict]) -> None:
    """
    TODO: Send email and create dashboard notification for admin
    when regulation changes are detected.
    """
    raise NotImplementedError("Regulation monitoring not yet implemented")


async def apply_approved_update(document_id: str) -> None:
    """
    TODO: Re-ingest updated sections once admin approves the update.
    Replace old chunks with new chunks, update document metadata.
    """
    raise NotImplementedError("Regulation monitoring not yet implemented")
