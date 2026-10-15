"""Tiny offline publishing CLI; Python stdlib only."""
import argparse
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', type=Path, required=True)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('create')
    create.add_argument('title')
    create.add_argument('body')
    create.add_argument('--kind', choices=['technical', 'product'], default='technical')
    publish = sub.add_parser('publish')
    publish.add_argument('id', type=int)
    sub.add_parser('list')
    search = sub.add_parser('search')
    search.add_argument('query')
    search.add_argument('--include-drafts', action='store_true')
    args = parser.parse_args()
    posts = json.loads(args.db.read_text()) if args.db.exists() else []
    if args.command == 'create':
        post = {'id': max([p['id'] for p in posts], default=0) + 1,
                'title': args.title, 'body': args.body, 'kind': args.kind, 'published': False}
        posts.append(post)
        args.db.parent.mkdir(parents=True, exist_ok=True)
        args.db.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(post, ensure_ascii=False))
    elif args.command == 'publish':
        matches = [p for p in posts if p['id'] == args.id]
        if not matches:
            parser.error('post not found')
        matches[0]['published'] = True
        args.db.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(matches[0], ensure_ascii=False))
    elif args.command == 'search':
        query = args.query.casefold()
        print(json.dumps([p for p in posts if (p['published'] or args.include_drafts) and query in (p['title'] + ' ' + p['body']).casefold()], ensure_ascii=False))
    elif args.command == 'list':
        print(json.dumps([p for p in posts if p['published']], ensure_ascii=False))


if __name__ == '__main__':
    main()
