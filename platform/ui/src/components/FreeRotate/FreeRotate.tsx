import classNames from 'classnames';
import { commandsManager } from '../../../../../platform/app/src/App';
import React, { useRef, useState } from 'react';
import InputRange from '../InputRange';
import throttle from 'lodash/throttle';
import Tooltip from '../Tooltip';

const FreeRotate = () => {
  const prevRotationRef = useRef(0);
  const [rotateValue, setRotateValue] = useState(0);

  const throttledHandleRotate = throttle((value: number) => {
    commandsManager.runCommand(
      'rotateViewportCW',
      { rotation: value - prevRotationRef.current },
      'CORNERSTONE'
    );

    prevRotationRef.current = value;
  }, 100);

  const handleRotate = (value: number) => {
    throttledHandleRotate(value);
    setRotateValue(value);
  };

  const flex = 'flex flex-col justify-center h-full w-[200px]';

  return (
    <div className={classNames(flex)}>
      <Tooltip content={<span>Free Rotate (angle)</span>}>
        <InputRange
          maxValue={360}
          minValue={0}
          unit={'°'}
          step={1}
          allowNumberEdit={true}
          value={rotateValue}
          onChange={handleRotate}
        />
      </Tooltip>
    </div>
  );
};

export default FreeRotate;
