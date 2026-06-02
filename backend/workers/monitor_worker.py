"""
Background monitor worker scaffold.

TODO: Build this after launch.
When implemented, this worker will use APScheduler to periodically call
monitor.check_for_updates() for each ingested document and trigger admin
notifications when regulation changes are detected.
"""
import logging
# from apscheduler.schedulers.asyncio import AsyncIOScheduler
# from backend.services.monitor import check_for_updates

logger = logging.getLogger(__name__)


# TODO: Uncomment and implement when reg monitoring feature is built.
#
# scheduler = AsyncIOScheduler()
#
# @scheduler.scheduled_job("interval", hours=24, id="check_reg_updates")
# async def check_regulation_updates():
#     """Check all ingested documents for regulation changes once per day."""
#     logger.info("Checking regulations for updates...")
#     # for each document in db:
#     #     await check_for_updates(document.id)
#
#
# def start_monitor_worker():
#     scheduler.start()
#     logger.info("Monitor worker started")
#
#
# def stop_monitor_worker():
#     scheduler.shutdown()
