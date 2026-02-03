import asyncio

from gimbal import Gimbal

OM2_ADDRESS = "78:04:73:C6:41:5F"
OM3_ADDRESS = "FC:6A:72:D9:FC:E4"
OM4_ADDRESS = "FE:F9:F0:EE:65:DC"


async def main():
    try:
        gimbal = Gimbal(OM4_ADDRESS)
        await gimbal.connect()
        yaw = [-1500, 1500]
        for i in range(30):
            await gimbal.rotate(
                mode=gimbal.RotationMode.SPEED,
                yaw=yaw[i%len(yaw)], pitch=0, roll=0,
                time=10
            )
            await asyncio.sleep(1.5)
    except asyncio.CancelledError:
        print("Task cancelled, cleaning up...")
    finally:
        await gimbal.disconnect()


if __name__ == '__main__':
    asyncio.run(main())
