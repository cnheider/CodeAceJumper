import { forEach, map, reduce } from 'ramda';
import {
  DecorationOptions,
  DecorationRenderOptions,
  Position,
  Range,
  TextEditor,
  TextEditorDecorationType,
  Uri,
  window
} from 'vscode';
import * as builder from 'xmlbuilder';

import { Config } from './config/config';
import { Placeholder } from './models/placeholder';

export class PlaceHolderDecorator {
  private config: Config;
  private placeholderCache: { [index: string]: Uri };
  private highlightCache: { [index: number]: Uri };
  private dim: TextEditorDecorationType;
  private decorations: TextEditorDecorationType[] = [];
  private highlights: TextEditorDecorationType[] = [];

  public refreshConfig(config: Config) {
    this.config = config;

    this.updateCache();
  }

  public addDecorations(editor: TextEditor, placeholders: Placeholder[]) {
    const width = this.config.placeholder.width;
    const height = this.config.placeholder.height;

    const decorationType = window.createTextEditorDecorationType({
      after: {
        margin: `0 0 0 ${1 * -width}px`,
        height: `${height}px`,
        width: `${1 * width}px`
      }
    });

    const options = map<Placeholder, DecorationOptions>(
      placeholder => ({
        range: new Range(
          placeholder.line,
          placeholder.character + 1,
          placeholder.line,
          placeholder.character + 1
        ),
        renderOptions: {
          dark: {
            after: {
              contentIconPath: this.placeholderCache[placeholder.placeholder]
            }
          },
          light: {
            after: {
              contentIconPath: this.placeholderCache[placeholder.placeholder]
            }
          }
        }
      }),
      placeholders
    );

    this.decorations.push(decorationType);

    editor.setDecorations(decorationType, options);
  }

  public addHighlights(
    editor: TextEditor,
    placeholders: Placeholder[],
    highlightCount: number
  ) {
    const width = this.config.placeholder.width;
    const height = this.config.placeholder.height;

    const decorationType = window.createTextEditorDecorationType({
      after: {
        margin: `0 0 0 ${1 * -width}px`,
        height: `${height}px`,
        width: `${1 * width}px`
      }
    });

    const options = map<Placeholder, DecorationOptions>(
      placeholder => ({
        range: new Range(
          placeholder.line,
          placeholder.character + 2,
          placeholder.line,
          placeholder.character + 2
        ),
        renderOptions: {
          dark: {
            after: {
              contentIconPath: this.highlightCache[highlightCount]
            }
          },
          light: {
            after: {
              contentIconPath: this.highlightCache[highlightCount]
            }
          }
        }
      }),
      placeholders
    );

    this.highlights.push(decorationType);

    editor.setDecorations(decorationType, options);
  }

  public dimEditor(editor: TextEditor, ranges: Range[]) {
    this.undimEditor(editor);

    const options: DecorationRenderOptions = {
      textDecoration: `none; filter: grayscale(1);`
    };

    this.dim = window.createTextEditorDecorationType(options);

    const toAddRanges = [];
    if (!!ranges && !!ranges.length) {
      toAddRanges.push(...ranges);
    } else {
      toAddRanges.push(
        new Range(
          new Position(0, 0),
          new Position(editor.document.lineCount, Number.MAX_VALUE)
        )
      );
    }

    editor.setDecorations(this.dim, toAddRanges);
  }

  public removeDecorations(editor: TextEditor) {
    forEach(item => {
      editor.setDecorations(item, []);
      item.dispose();
    }, this.decorations);

    this.decorations = [];
  }

  public removeHighlights(editor: TextEditor) {
    forEach(item => {
      editor.setDecorations(item, []);
      item.dispose();
    }, this.highlights);

    this.highlights = [];
  }

  public undimEditor(editor: TextEditor) {
    if (!!this.dim) {
      editor.setDecorations(this.dim, []);
      this.dim.dispose();
      delete this.dim;
    }
  }

  private updateCache() {
    this.placeholderCache = reduce<string, { [index: string]: Uri }>(
      (acc, code) => {
        acc[code] = this.buildUriForPlaceholder(code);
        return acc;
      },
      {}
    )(this.config.characters);

    this.highlightCache = reduce<number, { [index: number]: Uri }>(
      (acc, width) => {
        acc[width] = this.buildUriForHighlight(width);
        return acc;
      },
      {}
    )([...Array(10)].map((_, i) => i + 1));
  }

  private buildUriForPlaceholder(code: string) {
    const root = builder.create('svg', {}, {}, { headless: true });

    root
      .att('xmlns', 'http://www.w3.org/2000/svg')
      .att(
        'viewBox',
        `0 0 ${this.config.placeholder.width} ${this.config.placeholder.height}`
      )
      .att('width', this.config.placeholder.width)
      .att('height', this.config.placeholder.height);

    root
      .ele('rect')
      .att('width', this.config.placeholder.width)
      .att('height', this.config.placeholder.height)
      .att('rx', 2)
      .att('ry', 2)
      .att('style', `fill: ${this.config.placeholder.backgroundColor}`);

    root
      .ele('text')
      .att('font-weight', this.config.placeholder.fontWeight)
      .att('font-family', this.config.placeholder.fontFamily)
      .att('font-size', `${this.config.placeholder.fontSize}px`)
      .att('fill', this.config.placeholder.color)
      .att('x', this.config.placeholder.textPosX)
      .att('y', this.config.placeholder.textPosY)
      .text(
        this.config.placeholder.upperCase
          ? code.toUpperCase()
          : code.toLowerCase()
      );

    const svg = root.end({
      pretty: false
    });

    return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
  }

  private buildUriForHighlight(characterCount: number) {
    const root = builder.create('svg', {}, {}, { headless: true });

    const width = this.config.highlight.width * characterCount;
    const height = this.config.highlight.height;
    const offsetX = this.config.highlight.offsetX;
    const offsetY = this.config.highlight.offsetY;

    root
      .att('xmlns', 'http://www.w3.org/2000/svg')
      .att('viewBox', `${offsetX} ${offsetY} ${width} ${height}`)
      .att('width', width)
      .att('height', height);

    root
      .ele('rect')
      .att('width', width)
      .att('height', height)
      .att('rx', 2)
      .att('ry', 2)
      .att('style', `fill: ${this.config.highlight.backgroundColor}`);

    const svg = root.end({
      pretty: false
    });

    return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
  }
}
