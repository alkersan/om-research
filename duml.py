import struct
from pydantic import BaseModel, Field


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
        return f"len={self.length:<3} {self.sender_idx}.{self.sender:<2}->{self.receiver_idx}.{self.receiver:<2} seq={self.seq:<5} cmd_set=0x{self.cmd_set:02x} cmd=0x{self.cmd:02x} | {self.payload.hex(' ')}"


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
                length=length,
                sender_idx=packet_data[4] & 0x7,
                sender=packet_data[4] >> 3,
                receiver_idx=packet_data[5] & 0x7,
                receiver=packet_data[5] >> 3,
                seq=int.from_bytes(packet_data[6:8], "little", signed=False),
                cmd_set=int(packet_data[9]),
                cmd=int(packet_data[10]),
                raw=packet_data,
                payload=packet_data[11:length - 2]
            )
            yield packet
