const handleDraftSockets = require('../services/draftService');

const createSocketHarness = () => {
    const handlers = new Map();
    const socket = {
        user: { userId: 7 },
        on: jest.fn((event, handler) => handlers.set(event, handler)),
        emit: jest.fn(),
        join: jest.fn(),
        leave: jest.fn()
    };
    const io = { to: jest.fn(() => ({ emit: jest.fn() })) };

    handleDraftSockets(io, socket);
    return { handlers, socket, io };
};

describe('Draft Socket.IO protocol', () => {
    it('acknowledges invalid room joins with a structured error', async () => {
        const { handlers, socket } = createSocketHarness();
        const acknowledge = jest.fn();

        await handlers.get('draft:join_room')({}, acknowledge);

        const error = {
            code: 'BAD_REQUEST',
            message: 'Valid leagueId is required.'
        };
        expect(acknowledge).toHaveBeenCalledWith({ ok: false, error });
        expect(socket.emit).toHaveBeenCalledWith('draft:error', error);
        expect(socket.join).not.toHaveBeenCalled();
    });

    it('acknowledges invalid picks before accessing the database', async () => {
        const { handlers, socket } = createSocketHarness();
        const acknowledge = jest.fn();

        await handlers.get('draft:make_pick')({ leagueId: 12 }, acknowledge);

        expect(acknowledge).toHaveBeenCalledWith({
            ok: false,
            error: {
                code: 'BAD_REQUEST',
                message: 'Valid fantasyPlayerId is required.'
            }
        });
        expect(socket.emit).toHaveBeenCalledWith('draft:error', expect.objectContaining({ code: 'BAD_REQUEST' }));
    });

    it('acknowledges a room leave with the normalized league ID', async () => {
        const { handlers, socket } = createSocketHarness();
        const acknowledge = jest.fn();

        await handlers.get('draft:leave_room')({ leagueId: '12' }, acknowledge);

        expect(socket.leave).toHaveBeenCalledWith('draft_12');
        expect(acknowledge).toHaveBeenCalledWith({ ok: true, data: { leagueId: 12 } });
    });
});