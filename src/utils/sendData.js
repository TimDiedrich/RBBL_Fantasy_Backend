const sendData = (res, statusCode, data, meta) => {
    const body = { data };

    if (meta !== undefined) {
        body.meta = meta;
    }

    return res.status(statusCode).json(body);
};

module.exports = sendData;