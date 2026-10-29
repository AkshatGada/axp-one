//! Fixed little-endian encoding. No padding, defaults, optional tails or JSON.
use crate::error::{require, MarketError, Result};
use solana_program::pubkey::Pubkey;
pub type Bytes32 = [u8; 32];
pub const ZERO: Bytes32 = [0; 32];
pub const MAGIC: &[u8; 8] = b"AXPMKT02";
pub const WIRE_VERSION: u8 = 2;

pub struct Reader<'a> {
    data: &'a [u8],
    offset: usize,
}
impl<'a> Reader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        Self { data, offset: 0 }
    }
    pub fn bytes<const N: usize>(&mut self) -> Result<[u8; N]> {
        let end = self
            .offset
            .checked_add(N)
            .ok_or(MarketError::InvalidInput)?;
        let value = self
            .data
            .get(self.offset..end)
            .ok_or(MarketError::InvalidInput)?;
        self.offset = end;
        value
            .try_into()
            .map_err(|_| MarketError::InvalidInput.into())
    }
    pub fn u8(&mut self) -> Result<u8> {
        Ok(self.bytes::<1>()?[0])
    }
    pub fn u16(&mut self) -> Result<u16> {
        Ok(u16::from_le_bytes(self.bytes()?))
    }
    pub fn u32(&mut self) -> Result<u32> {
        Ok(u32::from_le_bytes(self.bytes()?))
    }
    pub fn u64(&mut self) -> Result<u64> {
        Ok(u64::from_le_bytes(self.bytes()?))
    }
    pub fn key(&mut self) -> Result<Pubkey> {
        Ok(Pubkey::new_from_array(self.bytes()?))
    }
    pub fn finish(self) -> Result<()> {
        require(self.offset == self.data.len(), MarketError::InvalidInput)
    }
}
#[derive(Default)]
pub struct Writer {
    pub data: Vec<u8>,
}
impl Writer {
    pub fn bytes(&mut self, value: &[u8]) {
        self.data.extend_from_slice(value);
    }
    pub fn u8(&mut self, value: u8) {
        self.bytes(&[value]);
    }
    pub fn u16(&mut self, value: u16) {
        self.bytes(&value.to_le_bytes());
    }
    pub fn u32(&mut self, value: u32) {
        self.bytes(&value.to_le_bytes());
    }
    pub fn u64(&mut self, value: u64) {
        self.bytes(&value.to_le_bytes());
    }
    pub fn key(&mut self, value: &Pubkey) {
        self.bytes(value.as_ref());
    }
}

pub trait FixedAccount: Sized {
    const KIND: u8;
    const LEN: usize;
    fn state(&self) -> u8;
    fn market(&self) -> &Pubkey;
    fn read_body(state: u8, market: Pubkey, reader: &mut Reader<'_>) -> Result<Self>;
    fn write_body(&self, writer: &mut Writer);
    fn validate(&self) -> Result<()>;
    fn decode(data: &[u8]) -> Result<Self> {
        require(data.len() == Self::LEN, MarketError::InvalidInput)?;
        let mut reader = Reader::new(data);
        require(&reader.bytes::<8>()? == MAGIC, MarketError::InvalidInput)?;
        require(reader.u8()? == Self::KIND, MarketError::InvalidInput)?;
        let state = reader.u8()?;
        let market = reader.key()?;
        let value = Self::read_body(state, market, &mut reader)?;
        reader.finish()?;
        value.validate()?;
        Ok(value)
    }
    fn encode(&self) -> Result<Vec<u8>> {
        self.validate()?;
        let mut writer = Writer::default();
        writer.bytes(MAGIC);
        writer.u8(Self::KIND);
        writer.u8(self.state());
        writer.key(self.market());
        self.write_body(&mut writer);
        require(writer.data.len() == Self::LEN, MarketError::InvalidInput)?;
        Ok(writer.data)
    }
}
