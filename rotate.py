import asyncio

from gimbal import Gimbal

OM2_ADDRESS = "78:04:73:C6:41:5F"  # OM2
OM3_ADDRESS = "FC:6A:72:D9:FC:E4"  # OM3


async def main():
    try:
        om3 = Gimbal(OM3_ADDRESS)
        await om3.connect()

        yaw, pitch = -500, -500
        for _ in range(30):
            yaw, pitch = -yaw, -pitch
            rotation = {
                "mode": om3.RotationMode.RELATIVE,
                "yaw": yaw, "pitch": pitch, "roll": 0,
                "time": 7,
            }
            await om3.rotate(**rotation)
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        print("Task cancelled, cleaning up...")
    finally:
        await om3.disconnect()


if __name__ == '__main__':
    asyncio.run(main())
