import * as React from 'react';
import { BaseDecorator } from './BaseDecorator';
import {
  findScrollableParent,
  getRect
} from '../../Utilities';

export interface IViewport {
  width: number;
  height: number;
}

export interface IWithViewportState {
  viewport?: IViewport;
}

export interface IWithViewportProps {
  skipViewportMeasures?: boolean;
}

const RESIZE_DELAY = 500;
const MAX_RESIZE_ATTEMPTS = 3;

export function withViewport<TProps extends { viewport?: IViewport }, TState>(ComposedComponent: (new (props: TProps, ...args: any[]) => React.Component<TProps, TState>)): any {

  return class WithViewportComponent extends BaseDecorator<TProps, IWithViewportState> {
    public refs: {
      [key: string]: React.ReactInstance;
    };

    private _resizeAttempts: number;

    constructor(props: TProps) {
      super(props);
      this._resizeAttempts = 0;

      this.state = {
        viewport: {
          width: 0,
          height: 0
        }
      };
    }

    public componentDidMount() {
      this._onAsyncResize = this._async.debounce(
        this._onAsyncResize,
        RESIZE_DELAY,
        {
          leading: false
        });

      this._events.on(window, 'resize', this._onAsyncResize);
      const {
        skipViewportMeasures
      } = this.props as IWithViewportProps;
      if (!skipViewportMeasures) {
        this._updateViewport();
      }
    }

    public componentWillUnmount() {
      this._events.dispose();
    }

    public render() {
      let { viewport } = this.state;
      const {
        skipViewportMeasures
      } = this.props as IWithViewportProps;
      let isViewportVisible = skipViewportMeasures || (viewport!.width > 0 && viewport!.height > 0);

      return (
        <div className='ms-Viewport' ref='root' style={ { minWidth: 1, minHeight: 1 } }>
          { isViewportVisible && (
            <ComposedComponent ref={ this._updateComposedComponentRef } viewport={ viewport } { ...this.props as any } />
          ) }
        </div>
      );
    }

    public forceUpdate() {
      this._updateViewport(true);
    }

    private _onAsyncResize() {
      this._updateViewport();
    }

    /* Note: using lambda here because decorators don't seem to work in decorators. */
    private _updateViewport = (withForceUpdate?: boolean) => {
      let { viewport } = this.state;
      let viewportElement = (this.refs as any).root;
      let scrollElement = findScrollableParent(viewportElement);
      let scrollRect = getRect(scrollElement);
      let clientRect = getRect(viewportElement);
      let updateComponent = () => {
        if (withForceUpdate && this._composedComponentInstance) {
          this._composedComponentInstance.forceUpdate();
        }
      };

      let isSizeChanged = (
        (clientRect && clientRect.width) !== viewport!.width ||
        (scrollRect && scrollRect.height) !== viewport!.height);

      if (isSizeChanged && this._resizeAttempts < MAX_RESIZE_ATTEMPTS && clientRect && scrollRect) {
        this._resizeAttempts++;
        this.setState({
          viewport: {
            width: clientRect.width,
            height: scrollRect.height
          }
        }, () => { this._updateViewport(withForceUpdate); });
      } else {
        this._resizeAttempts = 0;
        updateComponent();
      }
    }
  };
}
