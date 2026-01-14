import struct
import subprocess
from typing import Annotated
from pydantic import BaseModel, Field, PlainValidator

class Frame(BaseModel):
    number: int = Field(validation_alias="frame_frame_number")
    protocols: str = Field(validation_alias="frame_frame_protocols")


class HCI_H4(BaseModel):
    direction: int = Field(validation_alias="hci_h4_hci_h4_direction")
    type: int = Field(validation_alias="hci_h4_hci_h4_type")


class BTHCI_ACL(BaseModel):
    length: int = Field(validation_alias="bthci_acl_bthci_acl_length")
    src_addr: str = Field(validation_alias="bthci_acl_bthci_acl_src_bd_addr")
    src_name: str = Field(validation_alias="bthci_acl_bthci_acl_src_name")
    dst_addr: str = Field(validation_alias="bthci_acl_bthci_acl_dst_bd_addr")
    dst_name: str = Field(validation_alias="bthci_acl_bthci_acl_dst_name")


MyInt = Annotated[bytes, PlainValidator(lambda s: bytes.fromhex(s.replace(":", " ")), json_schema_input_type=str)]


class BTATT(BaseModel):
    opcode: int = Field(validation_alias="btatt_btatt_opcode")
    value: MyInt = Field(validation_alias="btatt_btatt_value")


class Packet(BaseModel):
    frame: Frame
    hci_h4: HCI_H4 | None = None
    bthci_acl: BTHCI_ACL | None = None
    btatt: BTATT | None = None


class Layers(BaseModel):
    timestamp: int
    layers: Packet


class DUMLPacket(BaseModel):
    length: int
    sender_idx: int
    sender: int
    receiver_idx: int
    receiver: int
    seq: int
    cmd_set: int
    cmd: int
    raw: bytes = Field(repr=False)
    payload: bytes = Field(repr=False)

    def __str__(self):
        return f"len={self.length:<3} {self.sender_idx}.{self.sender}->{self.receiver_idx}.{self.receiver:<2} seq={self.seq:<5} cmd_set=0x{self.cmd_set:02x} cmd=0x{self.cmd:02x} | {self.payload.hex(' ')}"


class DUMLParser:
    def __init__(self):
        self.buffer = b''

    def feed(self, data: bytes):
        self.buffer += data

        while True:
            if len(self.buffer) == 0:
                break

            if self.buffer[0] != 0x55:
                idx = self.buffer.find(b'\x55')
                if idx == -1:
                    self.buffer = b''
                    break
                self.buffer = self.buffer[idx:]
                continue

            if len(self.buffer) < 4:
                break

            length_raw = struct.unpack('<H', self.buffer[1:3])[0]
            length = length_raw & 0x3FF

            if len(self.buffer) < length:
                break

            packet_data = self.buffer[:length]
            self.buffer = self.buffer[length:]
            packet = DUMLPacket(
                length = length,
                sender_idx = packet_data[4] & 0x7,
                sender = packet_data[4] >> 3,
                receiver_idx = packet_data[5] & 0x7,
                receiver = packet_data[5] >> 3,
                seq = int.from_bytes(packet_data[6:8], "little", signed=False),
                cmd_set = int(packet_data[9]),
                cmd = int(packet_data[10]),
                raw = packet_data,
                payload = packet_data[11:length-2]
            )
            yield packet


# 02 - App
# 04 - Gimbal
# 09 - ??? HD transmission MCU air side
# e5 - ??? Center Board

#    |  header   |sr|ds| seq |fl| cmd |                       |crc32
#    |00 01 02 03|04|05|06 07|08|09|10|11 12 13 14 15 16 17 18|19 20
# -----------------------------------------------------------------------------
# <- |55 11 04 92|09 02 90 e0 00|02 b8|ff 4b 00 00|0a 5a             Camera Optics Zoom Mode
# <- |55 13 04 03|04 02 38 61 20|04 57|00 00 00 00 3a f5|16 07       Handheld Stick State Get/Push
# <- |55 0e 04 66|09 02 00 00 30|04 1c|25 31 af                      Get Gimbal Type
# -> |55 15 04 a9|02 04 f2 05 40|04 14|c2 01 00 00 00 00 05 14|02 f8 Rotate 45
# -> |55 0e 04 66|02 09 f3 05 80|00 0e|00|26 46                      Heartbeat
# -> |55 0e 04 66|02 e5 f4 05 80|00 0e|00|f5 c9                      Heartbeat
# -> |55 15 04 a9|02 04 07 06 40|04 14|c2 01 00 00 00 00 05 14|76 26 Rotate 45
# -> |55 15 04 a9|02 04 1c 06 40|04 14|c2 01 00 00 00 00 05 14|39 5f Rotate 45
# -> |55 15 04 a9|02 04 31 06 40|04 14|c2 01 00 00 00 00 05 14|e8 d4 Rotate 45

#                                     |yaw  |roll |pitch|??|ms|
# -> |55 15 04 a9|02 04 5e 00 40|04 14|3e fe 00 00 00 00 05 0a|5c 3f Rotate -45
# -> |55 15 04 a9|02 04 0f 00 40|04 14|c2 01 00 00 20 00 05 0f|d2 2d Rotate

def process(packet: DUMLPacket):
    if packet.cmd_set == 0 and packet.cmd == 14:
        return
    if packet.cmd_set == 4:
        print(packet)


def main():
    proc = subprocess.Popen(
        'tshark -i android-bluetooth-btsnoop-net-192.168.2.124:41135 -l -Tek',
        shell=True,
        stdout=subprocess.PIPE
    )

    parser = DUMLParser()
    for line in proc.stdout:
        try:
            packet = Layers.model_validate_json(line).layers
            if not packet.btatt or packet.hci_h4.direction != 0:
                continue

            for duml in parser.feed(packet.btatt.value):
                process(duml)
        except Exception as e:
            #print(e)
            pass


if __name__ == '__main__':
    main()
