import threading

from SnifferAPI import Sniffer, Devices, Packet

OM2_FOUND = threading.Event()
OM2_NAME = "OsmoM198DFAG00300HR"
OM2_ADDR = [0x78, 0x04, 0x73, 0xC6, 0x41, 0x5F, 0]
OM2_DEVICE: Devices.Device | None = None

def on_device(notification):
    device: Devices.Device = notification.msg
    if device.address == OM2_ADDR:
        print(f"OM2 found")
        OM2_FOUND.set()
        global OM2_DEVICE
        OM2_DEVICE = device

def on_packet(notification):
    packet: Packet.Packet = notification.msg["packet"]
    if not packet.crcOK:
        print("bad", ' '.join(f'{b:02X}' for b in packet.payload))
        return

    payload = ' '.join(f'{b:02X}' for b in packet.blePacket.payload)
    direction = "<-" if not packet.direction else "->"
    if packet.direction:
        print(f"{direction} {payload}")

def main():
    sniffer = Sniffer.Sniffer(portnum="/dev/ttyACM0", baudrate=1000000)
    sniffer.subscribe("DEVICE_ADDED", on_device)
    sniffer.subscribe("DEVICE_UPDATED", on_device)

    sniffer.clearDevices()
    sniffer.start()
    sniffer.scan()

    OM2_FOUND.wait()
    sniffer.clearCallbacks()

    sniffer.follow(OM2_DEVICE)
    sniffer.subscribe("NEW_BLE_PACKET", on_packet)

    try:
        input("Press Enter to exit...\n")
    finally:
        sniffer.doExit()

if __name__ == '__main__':
    main()
