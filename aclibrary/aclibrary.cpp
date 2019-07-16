#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <iostream>
#include <climits>
#include "tools.h"

typedef unsigned char uchar;
typedef unsigned short ushort;
typedef unsigned int uint;

#define TIGER_PASSES 3
#define PROTOCOL_VERSION 1201

namespace tiger
{
    typedef uint64_t chunk;

    union hashval
    {
        uchar bytes[3*8];
        chunk chunks[3];
    };

    chunk sboxes[4*256];

    void compress(const chunk *str, chunk state[3])
    {
        ASSERT(sizeof(chunk) == 8);
        chunk a, b, c;
        chunk aa, bb, cc;
        chunk x0, x1, x2, x3, x4, x5, x6, x7;

        a = state[0];
        b = state[1];
        c = state[2];

        x0 = lilswap(str[0]); x1 = lilswap(str[1]); x2 = lilswap(str[2]); x3 = lilswap(str[3]);
        x4 = lilswap(str[4]); x5 = lilswap(str[5]); x6 = lilswap(str[6]); x7 = lilswap(str[7]);

        aa = a;
        bb = b;
        cc = c;
        loop(pass_no, TIGER_PASSES)
        {
            if(pass_no)
            {
                x0 -= x7 ^ 0xA5A5A5A5A5A5A5A5ULL; x1 ^= x0; x2 += x1; x3 -= x2 ^ ((~x1)<<19);
                x4 ^= x3; x5 += x4; x6 -= x5 ^ ((~x4)>>23); x7 ^= x6;
                x0 += x7; x1 -= x0 ^ ((~x7)<<19); x2 ^= x1; x3 += x2;
                x4 -= x3 ^ ((~x2)>>23); x5 ^= x4; x6 += x5; x7 -= x6 ^ 0x0123456789ABCDEFULL;
            }

#define sb1 (sboxes)
#define sb2 (sboxes+256)
#define sb3 (sboxes+256*2)
#define sb4 (sboxes+256*3)

#define tround(a, b, c, x) \
      c ^= x; \
      a -= sb1[((c)>>(0*8))&0xFF] ^ sb2[((c)>>(2*8))&0xFF] ^ \
       sb3[((c)>>(4*8))&0xFF] ^ sb4[((c)>>(6*8))&0xFF] ; \
      b += sb4[((c)>>(1*8))&0xFF] ^ sb3[((c)>>(3*8))&0xFF] ^ \
       sb2[((c)>>(5*8))&0xFF] ^ sb1[((c)>>(7*8))&0xFF] ; \
      b *= mul;

            uint mul = !pass_no ? 5 : (pass_no==1 ? 7 : 9);
            tround(a, b, c, x0) tround(b, c, a, x1) tround(c, a, b, x2) tround(a, b, c, x3)
            tround(b, c, a, x4) tround(c, a, b, x5) tround(a, b, c, x6) tround(b, c, a, x7)

            chunk tmp = a; a = c; c = b; b = tmp;
        }

        a ^= aa;
        b -= bb;
        c += cc;

        state[0] = a;
        state[1] = b;
        state[2] = c;
    }

    void gensboxes()
    {
        const char *str = "Tiger - A Fast New Hash Function, by Ross Anderson and Eli Biham";
        chunk state[3] = { 0x0123456789ABCDEFULL, 0xFEDCBA9876543210ULL, 0xF096A5B4C3B2E187ULL };

        loopi(1024) loop(col, 8) ((uchar *)&sboxes[i])[col] = i&0xFF;

        int abc = 2;
        loop(pass, 5) loopi(256) for(int sb = 0; sb < 1024; sb += 256)
        {
            abc++;
            if(abc >= 3) { abc = 0; compress((const chunk *)str, state); }
            loop(col, 8)
            {
                uchar val = ((uchar *)&sboxes[sb+i])[col];
                ((uchar *)&sboxes[sb+i])[col] = ((uchar *)&sboxes[sb + ((uchar *)&state[abc])[col]])[col];
                ((uchar *)&sboxes[sb + ((uchar *)&state[abc])[col]])[col] = val;
            }
        }
    }

    struct incremental_buffer { int len, total; union { uchar u[64]; chunk c[8]; }; incremental_buffer() { len = total = 0; } };

    incremental_buffer *hash_init(hashval &val)
    {
        static bool init = false;
        if(!init) { gensboxes(); init = true; }

        val.chunks[0] = 0x0123456789ABCDEFULL;
        val.chunks[1] = 0xFEDCBA9876543210ULL;
        val.chunks[2] = 0xF096A5B4C3B2E187ULL;

        return new incremental_buffer;
    }

    void hash_incremental(const uchar *msg, int len, hashval &val, incremental_buffer *b)
    {
        ASSERT(b && b->len >= 0 && b->len < 64);
        b->total += len;
        while(b->len + len >= 64)
        {
            if(b->len > 0)
            { // fill up buffer and compress
                int fill = 64 - b->len;
                memcpy(b->u + b->len, msg, fill);
                compress(b->c, val.chunks);
                b->len = 0;
                len -= fill;
                msg += fill;
            }
            else
            { // compress directly from msg
                compress((chunk *)msg, val.chunks);
                len -= 64;
                msg += 64;
            }
        }
        if(len > 0)
        { // pur rest in buffer
            memcpy(b->u + b->len, msg, len);
            b->len += len;
        }
    }

    void hash_finish(hashval &val, incremental_buffer *b)
    {
        ASSERT(b && b->len >= 0 && b->len < 64);
        memset(b->u + b->len, 0, 64 - b->len);
        b->u[b->len] = 0x01;
        if(b->len >= 56)
        {
            compress(b->c, val.chunks);
            memset(b->u, 0, 64);
            b->len = 0;
        }
        b->c[7] = lilswap(chunk(b->total << 3));
        compress(b->c, val.chunks);
        lilswap(val.chunks, 3);
        delete b;
    }

    void hash(const uchar *str, int length, hashval &val)
    {
        incremental_buffer *b = hash_init(val);

        int i = length;
        for(; i >= 64; i -= 64, str += 64)
        {
            compress((chunk *)str, val.chunks);
        }

        memcpy(b->u, str, i);
        b->len = i;
        b->total = length;

        hash_finish(val, b);
    }
}

void tigerhash(uchar *hash, const uchar *msg, int len)
{
    tiger::hash(msg, len, *((tiger::hashval *) hash));
}

void *tigerhash_init(uchar *hash)
{
    return (void *)tiger::hash_init(*((tiger::hashval *) hash));
}

void tigerhash_add(uchar *hash, const void *msg, int len, void *state)
{
    tiger::hash_incremental((const uchar *)msg, len, *((tiger::hashval *) hash), (tiger::incremental_buffer *)state);
}

void tigerhash_finish(uchar *hash, void *state)
{
    if(hash) tiger::hash_finish(*((tiger::hashval *) hash), (tiger::incremental_buffer *)state);
    else delete (tiger::incremental_buffer *)state;
}

#undef sb1
#undef sb2
#undef sb3
#undef sb4
#undef tround

static const char *hashchunktoa(tiger::chunk h)   // portable solution instead of printf("%llx")
{                                                 // use next protocol bump to switch to hashstring() above!
    static string buf;
    static int bufidx;
    bufidx = (bufidx + 1) & 0x3;
    char *s = buf + (bufidx * 33) + 33;
    *s-- = '\0';
    while(h)
    {
        *s-- = "0123456789abcdef"[h & 0xf];
        h >>= 4;
    }
    return s + 1;
}

extern "C" {

const char *genpwdhash(const char *name, const char *pwd, int salt)
{
    static string temp;
    formatstring(temp)("%s %d %s %s %d", pwd, salt, name, pwd, iabs(PROTOCOL_VERSION));
    tiger::hashval hash;
    tiger::hash((uchar *)temp, (int)strlen(temp), hash);
    formatstring(temp)("%s %s %s", hashchunktoa(hash.chunks[0]), hashchunktoa(hash.chunks[1]), hashchunktoa(hash.chunks[2]));
    return temp;
}

}

int main(int argc, char **argv)
{
	printf("Value: '%s'\n\n", genpwdhash("Burak", "password", 10));
}