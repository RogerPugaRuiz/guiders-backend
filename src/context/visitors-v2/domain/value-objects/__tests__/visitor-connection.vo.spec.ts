import { VisitorConnectionVO, ConnectionStatus } from '../visitor-connection';

describe('VisitorConnectionVO', () => {
  it('crea estado offline por defecto', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
    expect(vo.getValue()).toBe(ConnectionStatus.OFFLINE);
    expect(vo.isOffline()).toBe(true);
  });

  it('transición OFFLINE -> ONLINE', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE).goOnline();
    expect(vo.getValue()).toBe(ConnectionStatus.ONLINE);
    expect(vo.isOnline()).toBe(true);
  });

  it('transición ONLINE -> CHATTING', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE)
      .goOnline()
      .startChatting();
    expect(vo.getValue()).toBe(ConnectionStatus.CHATTING);
    expect(vo.isChatting()).toBe(true);
  });

  it('transición CHATTING -> ONLINE (stopChatting)', () => {
    const chatting = new VisitorConnectionVO(ConnectionStatus.OFFLINE)
      .goOnline()
      .startChatting();
    const back = chatting.stopChatting();
    expect(back.getValue()).toBe(ConnectionStatus.ONLINE);
    expect(back.isOnline()).toBe(true);
  });

  it('transición cualquiera -> OFFLINE', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE)
      .goOnline()
      .startChatting()
      .goOffline();
    expect(vo.getValue()).toBe(ConnectionStatus.OFFLINE);
    expect(vo.isOffline()).toBe(true);
  });

  it('lanza error si intenta ONLINE desde ONLINE', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE).goOnline();
    expect(() => vo.goOnline()).toThrow();
  });

  it('lanza error si intenta CHATTING sin estar ONLINE', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE);
    expect(() => vo.startChatting()).toThrow();
  });

  it('lanza error si intenta stopChatting sin estar CHATTING', () => {
    const vo = new VisitorConnectionVO(ConnectionStatus.OFFLINE).goOnline();
    expect(() => vo.stopChatting()).toThrow();
  });
});
