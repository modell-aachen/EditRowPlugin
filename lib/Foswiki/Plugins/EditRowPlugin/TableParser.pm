# See bottom of file for copyright and license information
package Foswiki::Plugins::EditRowPlugin::TableParser;

use strict;
use Assert;

use Foswiki::Attrs          ();
use Foswiki::Func           ();
use CGI                     ();
use Foswiki::Tables::Reader ();
our @ISA = ('Foswiki::Tables::Reader');
use Foswiki::Plugins::EditRowPlugin::Table ();

sub new {
    my $class = shift;
    return $class->SUPER::new('Foswiki::Plugins::EditRowPlugin::Table');
}

=begin TML

---++ Object Method parse($text, $meta, $erps) -> \@list
   * =$text= - text to parse tables from
   * =$meta= - topicObject
   * =$erps= - erp_ parameters from URL, may be undef

Extract a topic into a list of lines and embedded table
definitions.

=cut

sub parse {
    my ( $this, $text, $meta, $erps ) = @_;

    $this->{params} = $erps;    # url params

    # them from processing as tables by converting them to verbatim.
    $text =~ s/<!-- (STARTINCLUDE .*?) -->/<verbatim \001="$1">/g;
    $text =~ s/<!-- (STOPINCLUDE .*?) -->/<\/verbatim \001="$1">/g;

    $this->SUPER::parse( $text, $meta );

    # Post-process the result built up by the event handlers
    # to deal with legacy and include marks
    my @result;
    foreach my $t ( @{ $this->{result} } ) {
        if ( UNIVERSAL::isa( $t, 'Foswiki::Tables::Table' ) ) {
            $t->{meta} = $meta;
            if ( defined( $t->{attrs}->{header} ) ) {

                # add a header if the header param is defined and
                # the table has no rows.
                my $line     = $t->{attrs}->{header};
                my $precruft = '';
                $precruft = $1 if $line =~ s/^(\s*\|)//;
                my $postcruft = '';
                $postcruft = $1 if $line =~ s/(\|\s*)$//;
                my @cols = split( /\|/, $line, -1 );

                my $row = $t->addRow(0);
                $row->setRow( \@cols );
                $row->isHeader(1);
                $t->{headerrows} = 1;

#                unshift( @{ $t->{rows} }, $row );
#test to see if there are both header & headerrows set, or if the parsed table already has the header in it
#try to coaless, and to use these to set the header row to be read only
            }
        }
        else {

            # STARTINCLUDE/STOPINCLUDE support
            $t =~ s/<\/?verbatim \001="(.*?)">/<!-- $1 -->/gs;
        }
        push( @result, $t );
    }

    return \@result;
}

# Called from the early_line handler to adjust default attributes based
# on what is in the URL params.
sub adjustSpec {
    my ( $this, $attrs ) = @_;

    # Signal that the following table is editable to the table
    # accretion code
    $attrs->{isEditable} = 1;

    # Analyse request parameters
    if ( $this->{params} ) {
        my $pf = 'erp_' . ( $this->{nTables} + 1 );
        my $format = $this->{params}->{"${pf}_format"};
        if ( defined($format) ) {

            # override the format
            # undo the encoding
            $format =~ s/-([a-z\d][a-z\d])/chr(hex($1))/gie;
            $attrs->{format} = $format;
        }
        if ( defined( $this->{params}->{"${pf}_headerrows"} ) ) {
            $attrs->{headerrows} = $this->{params}->{"${pf}_headerrows"};
        }
        if ( defined( $this->{params}->{"${pf}_footerrows"} ) ) {
            $attrs->{footerrows} = $this->{params}->{"$pf}_footerrows"};
        }
    }
}

1;
__END__

Author: Crawford Currie http://c-dot.co.uk

Copyright (c) 2012 Foswiki Contributors
All Rights Reserved. Foswiki Contributors are listed in the
AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

Do not remove this copyright notice.
