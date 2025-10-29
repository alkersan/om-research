import threading

from SnifferAPI import Sniffer, Devices, Packet

OM2_FOUND = threading.Event()
OM2_NAME = "OsmoM198DFAG00300HR"
OM2_DEVICE: Devices.Device | None = None

def on_device(notification):
    device: Devices.Device = notification.msg
    if device.name == f'"{OM2_NAME}"':
        print(f"OM2 found: {device}")
        OM2_FOUND.set()
        global OM2_DEVICE
        OM2_DEVICE = device

def on_packet(notification):
    packet: Packet.Packet = notification.msg["packet"]
    if not packet.crcOK:
        return
    hex = ' '.join(f'{b:02X}' for b in packet.blePacket.payload)
    print(hex)

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

    input("Press Enter to continue...")
    sniffer.doExit()

if __name__ == '__main__':
    main()
