import React from 'react';
import PropTypes from 'prop-types';
import './ServerItem.css';

const ServerItem = ({ onClick, children }) => {
  return (
    <div className="server-item" onClick={onClick}>
      {children}
    </div>
  );
};

ServerItem.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

export default ServerItem;